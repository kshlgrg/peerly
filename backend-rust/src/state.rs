use crate::games::GameState;
use crate::supabase::SupabaseLogger;
use axum::extract::ws::Message;
use chrono::Utc;
use serde_json::json;
use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};
use uuid::Uuid;

pub type Tx = mpsc::UnboundedSender<Message>;

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct ClientSession {
    pub id: String,
    pub mode: Option<String>,
    pub ip_address: String,
    pub session_id: Option<String>,
    pub user_type: Option<String>, // "user1" or "user2"
}

pub struct StateInner {
    pub clients: HashMap<String, ClientSession>,
    pub senders: HashMap<String, Tx>,
    pub waiting: HashMap<String, VecDeque<String>>,
    pub partners: HashMap<String, String>,
    pub skip_blocks: HashMap<String, HashSet<String>>,
    pub reports: VecDeque<serde_json::Value>,
    pub games: HashMap<String, GameState>,
    pub video_requests: HashMap<String, String>,
}

#[derive(Clone)]
pub struct AppState {
    pub inner: Arc<Mutex<StateInner>>,
    pub supabase: Arc<SupabaseLogger>,
}

impl AppState {
    pub fn new() -> Self {
        let mut waiting = HashMap::new();
        waiting.insert("text".to_string(), VecDeque::new());
        waiting.insert("video".to_string(), VecDeque::new());

        Self {
            inner: Arc::new(Mutex::new(StateInner {
                clients: HashMap::new(),
                senders: HashMap::new(),
                waiting,
                partners: HashMap::new(),
                skip_blocks: HashMap::new(),
                reports: VecDeque::with_capacity(250),
                games: HashMap::new(),
                video_requests: HashMap::new(),
            })),
            supabase: SupabaseLogger::new(),
        }
    }

    pub fn pair_key(first: &str, second: &str) -> String {
        if first < second {
            format!("{}::{}", first, second)
        } else {
            format!("{}::{}", second, first)
        }
    }

    pub async fn send_to(&self, client_id: &str, payload: serde_json::Value) {
        let text = payload.to_string();
        let inner = self.inner.lock().await;
        if let Some(tx) = inner.senders.get(client_id) {
            let _ = tx.send(Message::Text(text));
        }
    }

    pub async fn register_client(&self, client_id: &str, ip: &str, tx: Tx) {
        let mut inner = self.inner.lock().await;
        inner.clients.insert(
            client_id.to_string(),
            ClientSession {
                id: client_id.to_string(),
                mode: None,
                ip_address: ip.to_string(),
                session_id: None,
                user_type: None,
            },
        );
        inner.senders.insert(client_id.to_string(), tx);
    }

    pub async fn handle_disconnect(&self, client_id: &str) {
        let (partner_to_requeue, partner_mode, session_id) = {
            let mut inner = self.inner.lock().await;
            let client = inner.clients.remove(client_id);
            inner.senders.remove(client_id);

            // Remove from waiting queues
            for queue in inner.waiting.values_mut() {
                queue.retain(|id| id != client_id);
            }

            // Remove skip blocks
            inner.skip_blocks.remove(client_id);
            for blocked in inner.skip_blocks.values_mut() {
                blocked.remove(client_id);
            }

            let mut partner_to_requeue = None;
            let mut partner_mode = None;

            if let Some(partner_id) = inner.partners.remove(client_id) {
                inner.partners.remove(&partner_id);
                let p_key = Self::pair_key(client_id, &partner_id);
                inner.games.remove(&p_key);
                inner.video_requests.remove(&p_key);

                if let Some(partner) = inner.clients.get(&partner_id) {
                    partner_to_requeue = Some(partner_id);
                    partner_mode = partner.mode.clone();
                }
            }

            let session_id = client.and_then(|c| c.session_id);
            (partner_to_requeue, partner_mode, session_id)
        };

        if let Some(sid) = session_id {
            self.supabase.log_session_end(sid, "disconnect".to_string());
        }

        if let Some(partner_id) = partner_to_requeue {
            self.send_to(
                &partner_id,
                json!({
                    "type": "partner_left",
                    "reason": "disconnect",
                    "message": "They vanished. The queue is finding someone less dramatic..."
                }),
            )
            .await;

            if let Some(mode) = partner_mode {
                self.handle_join(&partner_id, &mode).await;
            }
        }
    }

    pub async fn handle_join(&self, client_id: &str, mode: &str) {
        if mode != "text" && mode != "video" {
            self.send_to(client_id, json!({"type": "error", "message": "Unknown chat mode."})).await;
            return;
        }

        let mut matched_pair = None;
        {
            let mut inner = self.inner.lock().await;
            if let Some(client) = inner.clients.get_mut(client_id) {
                client.mode = Some(mode.to_string());
            } else {
                return;
            }

            // Remove client from waiting queue and break existing pair
            for q in inner.waiting.values_mut() {
                q.retain(|id| id != client_id);
            }
            if let Some(partner_id) = inner.partners.remove(client_id) {
                inner.partners.remove(&partner_id);
                let p_key = Self::pair_key(client_id, &partner_id);
                inner.games.remove(&p_key);
                inner.video_requests.remove(&p_key);
            }

            // Find match
            let mut match_id = None;
            let client_blocks = inner.skip_blocks.get(client_id).cloned().unwrap_or_default();

            if let Some(mut queue) = inner.waiting.remove(mode) {
                let mut remaining = VecDeque::new();
                while let Some(candidate_id) = queue.pop_front() {
                    if !inner.clients.contains_key(&candidate_id) || candidate_id == client_id {
                        continue;
                    }
                    let candidate_blocks = inner.skip_blocks.get(&candidate_id).cloned().unwrap_or_default();
                    if match_id.is_none() && !client_blocks.contains(&candidate_id) && !candidate_blocks.contains(client_id) {
                        match_id = Some(candidate_id);
                    } else {
                        remaining.push_back(candidate_id);
                    }
                }
                inner.waiting.insert(mode.to_string(), remaining);
            }

            if let Some(waiting_id) = match_id {
                inner.partners.insert(client_id.to_string(), waiting_id.clone());
                inner.partners.insert(waiting_id.clone(), client_id.to_string());
                matched_pair = Some((waiting_id, client_id.to_string()));
            } else if let Some(queue) = inner.waiting.get_mut(mode) {
                queue.push_back(client_id.to_string());
            }
        }

        if let Some((first_id, second_id)) = matched_pair {
            let session_id = Uuid::new_v4().to_string();
            let matched_at = Utc::now().to_rfc3339();

            let (c1_ip, c2_ip) = {
                let mut inner = self.inner.lock().await;
                let c1 = inner.clients.get_mut(&first_id);
                let c1_ip = if let Some(c) = c1 {
                    c.session_id = Some(session_id.clone());
                    c.user_type = Some("user1".to_string());
                    c.ip_address.clone()
                } else {
                    "unknown".to_string()
                };

                let c2 = inner.clients.get_mut(&second_id);
                let c2_ip = if let Some(c) = c2 {
                    c.session_id = Some(session_id.clone());
                    c.user_type = Some("user2".to_string());
                    c.ip_address.clone()
                } else {
                    "unknown".to_string()
                };
                (c1_ip, c2_ip)
            };

            // Supabase session start
            self.supabase.log_session_start(
                session_id.clone(),
                first_id.clone(),
                c1_ip.clone(),
                second_id.clone(),
                c2_ip.clone(),
                mode.to_string(),
            );

            self.supabase.log_message(
                session_id.clone(),
                first_id.clone(),
                c1_ip,
                "user1".to_string(),
                "matched".to_string(),
                None,
                Some(json!({"initiator": true, "partner_id": second_id})),
                mode.to_string(),
            );

            self.supabase.log_message(
                session_id,
                second_id.clone(),
                c2_ip,
                "user2".to_string(),
                "matched".to_string(),
                None,
                Some(json!({"initiator": false, "partner_id": first_id})),
                mode.to_string(),
            );

            self.send_to(
                &first_id,
                json!({
                    "type": "matched",
                    "mode": mode,
                    "initiator": true,
                    "matchedAt": matched_at
                }),
            )
            .await;

            self.send_to(
                &second_id,
                json!({
                    "type": "matched",
                    "mode": mode,
                    "initiator": false,
                    "matchedAt": matched_at
                }),
            )
            .await;
        } else {
            self.send_to(client_id, json!({"type": "waiting", "mode": mode})).await;
        }
    }

    pub async fn handle_next(&self, client_id: &str) {
        let (mode, affected, session_id) = {
            let mut inner = self.inner.lock().await;
            let client = match inner.clients.get(client_id) {
                Some(c) => c.clone(),
                None => return,
            };

            let mode = client.mode.clone();
            let session_id = client.session_id.clone();

            let partner_id = inner.partners.remove(client_id);
            let affected = if let Some(p_id) = partner_id {
                inner.partners.remove(&p_id);
                let p_key = Self::pair_key(client_id, &p_id);
                inner.games.remove(&p_key);
                inner.video_requests.remove(&p_key);

                // Add skip blocks
                inner.skip_blocks.entry(client_id.to_string()).or_default().insert(p_id.clone());
                inner.skip_blocks.entry(p_id.clone()).or_default().insert(client_id.to_string());
                vec![client_id.to_string(), p_id]
            } else {
                vec![client_id.to_string()]
            };

            for q in inner.waiting.values_mut() {
                q.retain(|id| id != client_id);
            }

            (mode, affected, session_id)
        };

        if let Some(sid) = session_id {
            self.supabase.log_session_end(sid, "next".to_string());
        }

        for affected_id in &affected {
            if affected_id != client_id {
                self.send_to(
                    affected_id,
                    json!({
                        "type": "partner_left",
                        "reason": "next",
                        "message": "They skipped. Their loss, obviously..."
                    }),
                )
                .await;
            }
        }

        if let Some(mode) = mode {
            for affected_id in affected {
                self.handle_join(&affected_id, &mode).await;
            }
        }
    }

    pub async fn handle_game(&self, sender_id: &str, payload: &serde_json::Value) {
        let action = payload.get("action").and_then(|v| v.as_str()).unwrap_or("");
        let game_type = payload.get("game").and_then(|v| v.as_str()).unwrap_or("tic_tac_toe");
        let move_data = payload.get("move").cloned().unwrap_or(json!({}));

        let (partner_id, sender_state, partner_state, err_msg) = {
            let mut inner = self.inner.lock().await;
            let partner_id = match inner.partners.get(sender_id) {
                Some(p) => p.clone(),
                None => {
                    return self
                        .send_to(sender_id, json!({"type": "game_error", "message": "Match first, then cook."}))
                        .await;
                }
            };

            let p_key = Self::pair_key(sender_id, &partner_id);

            if action == "start" {
                let new_game = GameState::new(game_type, sender_id, &partner_id);
                inner.games.insert(p_key.clone(), new_game);
            }

            let game = match inner.games.get_mut(&p_key) {
                Some(g) => g,
                None => {
                    return self
                        .send_to(sender_id, json!({"type": "game_error", "message": "Start a game first."}))
                        .await;
                }
            };

            let mut err = None;
            if action == "move" {
                if let Err(e) = game.apply_move(sender_id, &move_data) {
                    err = Some(e);
                }
            }

            if let Some(e) = err {
                (partner_id, None, None, Some(e))
            } else {
                let s_state = game.serialize_for(sender_id);
                let p_state = game.serialize_for(&partner_id);
                (partner_id, Some(s_state), Some(p_state), None)
            }
        };

        if let Some(err) = err_msg {
            self.send_to(sender_id, json!({"type": "game_error", "message": err})).await;
            return;
        }

        if let (Some(s_state), Some(p_state)) = (sender_state, partner_state) {
            self.send_to(sender_id, json!({"type": "game_state", "data": s_state})).await;
            self.send_to(&partner_id, json!({"type": "game_state", "data": p_state})).await;
        }
    }

    pub async fn handle_video_request(&self, sender_id: &str) {
        let partner_id = {
            let mut inner = self.inner.lock().await;
            match inner.partners.get(sender_id).cloned() {
                Some(p) => {
                    let key = Self::pair_key(sender_id, &p);
                    inner.video_requests.insert(key, sender_id.to_string());
                    Some(p)
                }
                None => None,
            }
        };

        if let Some(partner_id) = partner_id {
            let requested_at = Utc::now().to_rfc3339();
            self.send_to(
                sender_id,
                json!({
                    "type": "video_request_sent",
                    "requestedAt": requested_at,
                    "message": "Video request sent. Now we wait to see if your aura has clearance."
                }),
            )
            .await;

            self.send_to(
                &partner_id,
                json!({
                    "type": "video_request",
                    "requestedAt": requested_at,
                    "message": "They want to upgrade to video. Accept only if the vibe survived inspection."
                }),
            )
            .await;
        } else {
            self.send_to(sender_id, json!({"type": "error", "message": "Match first, then request the face reveal."})).await;
        }
    }

    pub async fn handle_video_response(&self, sender_id: &str, accepted: bool) {
        let requester_id = {
            let mut inner = self.inner.lock().await;
            match inner.partners.get(sender_id).cloned() {
                Some(req_id) => {
                    let key = Self::pair_key(sender_id, &req_id);
                    if inner.video_requests.get(&key) == Some(&req_id) {
                        inner.video_requests.remove(&key);
                        Some(req_id)
                    } else {
                        None
                    }
                }
                None => None,
            }
        };

        if let Some(req_id) = requester_id {
            if accepted {
                self.handle_upgrade(&req_id, "video").await;
            } else {
                let responded_at = Utc::now().to_rfc3339();
                self.send_to(
                    sender_id,
                    json!({
                        "type": "video_request_resolved",
                        "accepted": false,
                        "respondedAt": responded_at,
                        "message": "You declined. Boundaries remain undefeated."
                    }),
                )
                .await;

                self.send_to(
                    &req_id,
                    json!({
                        "type": "video_request_resolved",
                        "accepted": false,
                        "respondedAt": responded_at,
                        "message": "Video request declined. Their camera said not today."
                    }),
                )
                .await;
            }
        } else {
            self.send_to(sender_id, json!({"type": "error", "message": "No video request is waiting. The drama expired."})).await;
        }
    }

    pub async fn handle_upgrade(&self, sender_id: &str, mode: &str) {
        if mode != "video" {
            self.send_to(sender_id, json!({"type": "error", "message": "That upgrade path does not exist yet."})).await;
            return;
        }

        let partner_id = {
            let mut inner = self.inner.lock().await;
            match inner.partners.get(sender_id).cloned() {
                Some(p) => {
                    if let Some(c) = inner.clients.get_mut(sender_id) {
                        c.mode = Some(mode.to_string());
                    }
                    if let Some(p_c) = inner.clients.get_mut(&p) {
                        p_c.mode = Some(mode.to_string());
                    }
                    for q in inner.waiting.values_mut() {
                        q.retain(|id| id != sender_id && id != &p);
                    }
                    let key = Self::pair_key(sender_id, &p);
                    inner.video_requests.remove(&key);
                    Some(p)
                }
                None => None,
            }
        };

        if let Some(partner_id) = partner_id {
            let upgraded_at = Utc::now().to_rfc3339();
            self.send_to(
                sender_id,
                json!({
                    "type": "mode_changed",
                    "mode": mode,
                    "initiator": true,
                    "changedAt": upgraded_at,
                    "message": "Video mode unlocked. The chat receipts survived."
                }),
            )
            .await;

            self.send_to(
                &partner_id,
                json!({
                    "type": "mode_changed",
                    "mode": mode,
                    "initiator": false,
                    "changedAt": upgraded_at,
                    "message": "They upgraded the room to video. The chat receipts survived."
                }),
            )
            .await;
        } else {
            self.send_to(sender_id, json!({"type": "error", "message": "Match first, then escalate the eye contact."})).await;
        }
    }

    pub async fn handle_relay(&self, sender_id: &str, payload: serde_json::Value) {
        let (partner_id, session_id, user_type, client_ip, room_mode) = {
            let inner = self.inner.lock().await;
            let partner_id = inner.partners.get(sender_id).cloned();
            let client = inner.clients.get(sender_id);
            let session_id = client.and_then(|c| c.session_id.clone());
            let user_type = client.and_then(|c| c.user_type.clone());
            let client_ip = client.map(|c| c.ip_address.clone()).unwrap_or_else(|| "unknown".to_string());
            let room_mode = client.and_then(|c| c.mode.clone()).unwrap_or_else(|| "text".to_string());
            (partner_id, session_id, user_type, client_ip, room_mode)
        };

        let partner_id = match partner_id {
            Some(p) => p,
            None => {
                self.send_to(sender_id, json!({"type": "error", "message": "No peer connected yet."})).await;
                return;
            }
        };

        let msg_type = payload.get("type").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let data = payload.get("data").cloned();

        let mut outgoing = json!({
            "type": msg_type,
            "data": data,
            "from": sender_id
        });

        if msg_type == "message" {
            outgoing["sentAt"] = json!(Utc::now().to_rfc3339());
        }

        if let (Some(sid), Some(ut)) = (session_id, user_type) {
            let content_str = if msg_type == "message" {
                data.as_ref().map(|d| d.as_str().unwrap_or("").to_string())
            } else {
                None
            };
            self.supabase.log_message(
                sid,
                sender_id.to_string(),
                client_ip,
                ut,
                msg_type,
                content_str,
                Some(payload.clone()),
                room_mode,
            );
        }

        self.send_to(&partner_id, outgoing).await;
    }

    pub async fn handle_report(&self, reporter_id: &str, reason: &str) {
        let clean_reason = if reason.len() > 280 { &reason[..280] } else { reason };
        let _partner_id = {
            let mut inner = self.inner.lock().await;
            let partner_id = inner.partners.get(reporter_id).cloned();
            if inner.reports.len() >= 250 {
                inner.reports.pop_front();
            }
            inner.reports.push_back(json!({
                "reporterId": reporter_id,
                "reportedId": partner_id,
                "reason": clean_reason,
                "createdAt": Utc::now().to_rfc3339()
            }));
            partner_id
        };

        self.send_to(
            reporter_id,
            json!({
                "type": "reported",
                "message": "Report locked. Hit Skip if the vibe is radioactive."
            }),
        )
        .await;
    }
}

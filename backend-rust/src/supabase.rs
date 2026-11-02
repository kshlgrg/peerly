use chrono::Utc;
use reqwest::Client;
use serde_json::json;
use std::env;
use std::sync::Arc;
use tracing::{info, warn};

#[derive(Clone)]
pub struct SupabaseLogger {
    url: String,
    service_key: String,
    client: Client,
    enabled: bool,
}

impl SupabaseLogger {
    pub fn new() -> Arc<Self> {
        let url = env::var("SUPABASE_URL").unwrap_or_default();
        let service_key = env::var("SUPABASE_SERVICE_KEY").unwrap_or_default();
        let enabled = !url.is_empty() && !service_key.is_empty();

        if enabled {
            info!("✅ Supabase logger initialized for {}", url);
        } else {
            info!("ℹ️ Supabase logger disabled (SUPABASE_URL or SUPABASE_SERVICE_KEY not set)");
        }

        Arc::new(Self {
            url,
            service_key,
            client: Client::new(),
            enabled,
        })
    }

    pub fn log_session_start(
        self: &Arc<Self>,
        session_id: String,
        c1_id: String,
        c1_ip: String,
        c2_id: String,
        c2_ip: String,
        mode: String,
    ) {
        if !self.enabled {
            return;
        }

        let logger = Arc::clone(self);
        tokio::spawn(async move {
            let endpoint = format!("{}/rest/v1/chat_sessions", logger.url.trim_end_matches('/'));
            let payload = json!({
                "session_id": session_id,
                "client1_id": c1_id,
                "client1_ip": c1_ip,
                "client2_id": c2_id,
                "client2_ip": c2_ip,
                "room_mode": mode,
                "status": "active",
                "started_at": Utc::now().to_rfc3339()
            });

            if let Err(e) = logger
                .client
                .post(&endpoint)
                .header("apikey", &logger.service_key)
                .header("Authorization", format!("Bearer {}", logger.service_key))
                .header("Content-Type", "application/json")
                .header("Prefer", "return=minimal")
                .json(&payload)
                .send()
                .await
            {
                warn!("Failed to log chat session start to Supabase: {}", e);
            }
        });
    }

    pub fn log_session_end(self: &Arc<Self>, session_id: String, reason: String) {
        if !self.enabled {
            return;
        }

        let logger = Arc::clone(self);
        tokio::spawn(async move {
            let endpoint = format!(
                "{}/rest/v1/chat_sessions?session_id=eq.{}",
                logger.url.trim_end_matches('/'),
                session_id
            );
            let payload = json!({
                "status": "ended",
                "end_reason": reason,
                "ended_at": Utc::now().to_rfc3339()
            });

            if let Err(e) = logger
                .client
                .patch(&endpoint)
                .header("apikey", &logger.service_key)
                .header("Authorization", format!("Bearer {}", logger.service_key))
                .header("Content-Type", "application/json")
                .json(&payload)
                .send()
                .await
            {
                warn!("Failed to log chat session end to Supabase: {}", e);
            }
        });
    }

    pub fn log_message(
        self: &Arc<Self>,
        session_id: String,
        client_id: String,
        client_ip: String,
        user_type: String,
        message_type: String,
        content: Option<String>,
        metadata: Option<serde_json::Value>,
        room_mode: String,
    ) {
        if !self.enabled {
            return;
        }

        let logger = Arc::clone(self);
        tokio::spawn(async move {
            let endpoint = format!("{}/rest/v1/chat_logs", logger.url.trim_end_matches('/'));
            let payload = json!({
                "session_id": session_id,
                "client_id": client_id,
                "client_ip": client_ip,
                "user_type": user_type,
                "message_type": message_type,
                "message_content": content,
                "metadata": metadata,
                "room_mode": room_mode,
                "timestamp": Utc::now().to_rfc3339()
            });

            if let Err(e) = logger
                .client
                .post(&endpoint)
                .header("apikey", &logger.service_key)
                .header("Authorization", format!("Bearer {}", logger.service_key))
                .header("Content-Type", "application/json")
                .header("Prefer", "return=minimal")
                .json(&payload)
                .send()
                .await
            {
                warn!("Failed to log chat message to Supabase: {}", e);
            }
        });
    }
}

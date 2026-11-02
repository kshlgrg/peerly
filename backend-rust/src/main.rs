mod games;
mod state;
mod supabase;

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        ConnectInfo, State,
    },
    http::{HeaderMap, Method, StatusCode},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use std::env;
use std::net::SocketAddr;
use tokio::sync::mpsc;
use tower_http::cors::{Any, CorsLayer};
use tracing::info;
use uuid::Uuid;

use crate::state::AppState;

#[tokio::main]
async fn main() {
    let _ = dotenvy::dotenv();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,peerly_api_rust=debug".into()),
        )
        .init();

    let state = AppState::new();

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any);

    let app = Router::new()
        .route("/health", get(health_handler))
        .route("/", get(root_handler))
        .route("/ws", get(ws_handler))
        .layer(cors)
        .with_state(state);

    let port: u16 = env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8000);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("🚀 PeerLy Rust backend listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.expect("Failed to bind TCP listener");
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>())
        .await
        .expect("Server failed");
}

async fn health_handler() -> impl IntoResponse {
    Json(json!({"status": "ok"}))
}

async fn root_handler() -> impl IntoResponse {
    Json(json!({"name": "PeerLy API", "status": "ok"}))
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    headers: HeaderMap,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    // Check origins if restricted
    let ws_origins = env::var("PEERLY_WS_ORIGINS").unwrap_or_else(|_| "*".to_string());
    if ws_origins != "*" {
        if let Some(origin) = headers.get("origin").and_then(|o| o.to_str().ok()) {
            let allowed: Vec<&str> = ws_origins.split(',').map(|s| s.trim()).collect();
            if !allowed.contains(&origin) {
                return StatusCode::FORBIDDEN.into_response();
            }
        }
    }

    let ip = headers
        .get("x-forwarded-for")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.split(',').next())
        .map(|s| s.trim().to_string())
        .or_else(|| {
            headers
                .get("x-real-ip")
                .and_then(|h| h.to_str().ok())
                .map(|s| s.to_string())
        })
        .unwrap_or_else(|| addr.ip().to_string());

    ws.on_upgrade(move |socket| handle_socket(socket, state, ip))
}

async fn handle_socket(socket: WebSocket, state: AppState, ip: String) {
    let client_id = Uuid::new_v4().to_string();
    let (mut ws_sender, mut ws_receiver) = socket.split();
    let (tx, mut rx) = mpsc::unbounded_channel();

    state.register_client(&client_id, &ip, tx).await;

    // Send connected welcome message
    state
        .send_to(
            &client_id,
            json!({"type": "connected", "clientId": client_id}),
        )
        .await;

    // Writer task: forwards messages from channel to websocket
    let writer_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    // Reader task: processes incoming messages from websocket
    let client_id_clone = client_id.clone();
    let state_clone = state.clone();

    while let Some(result) = ws_receiver.next().await {
        let msg = match result {
            Ok(msg) => msg,
            Err(e) => {
                info!("WebSocket error for client {}: {}", client_id, e);
                break;
            }
        };

        match msg {
            Message::Text(text) => {
                let payload: serde_json::Value = match serde_json::from_str(&text) {
                    Ok(p) => p,
                    Err(_) => {
                        state
                            .send_to(
                                &client_id,
                                json!({"type": "error", "message": "Invalid JSON."}),
                            )
                            .await;
                        continue;
                    }
                };

                let msg_type = payload.get("type").and_then(|v| v.as_str()).unwrap_or("");
                match msg_type {
                    "join" => {
                        let mode = payload.get("mode").and_then(|v| v.as_str()).unwrap_or("text");
                        state.handle_join(&client_id, mode).await;
                    }
                    "next" => {
                        state.handle_next(&client_id).await;
                    }
                    "report" => {
                        let reason = payload
                            .get("data")
                            .and_then(|v| v.as_str())
                            .unwrap_or("No reason provided.");
                        state.handle_report(&client_id, reason).await;
                    }
                    "game" => {
                        let data = payload.get("data").cloned().unwrap_or(json!({}));
                        state.handle_game(&client_id, &data).await;
                    }
                    "video_request" => {
                        state.handle_video_request(&client_id).await;
                    }
                    "video_response" => {
                        let accepted = payload.get("accepted").and_then(|v| v.as_bool()).unwrap_or(false);
                        state.handle_video_response(&client_id, accepted).await;
                    }
                    "upgrade" => {
                        let mode = payload.get("mode").and_then(|v| v.as_str()).unwrap_or("video");
                        state.handle_upgrade(&client_id, mode).await;
                    }
                    "message" => {
                        let data_str = payload.get("data").and_then(|v| v.as_str()).unwrap_or("");
                        if data_str.len() > 1200 {
                            state
                                .send_to(
                                    &client_id,
                                    json!({"type": "error", "message": "Essay detected. Trim it."}),
                                )
                                .await;
                            continue;
                        }
                        state.handle_relay(&client_id, payload).await;
                    }
                    "offer" | "answer" | "ice" => {
                        state.handle_relay(&client_id, payload).await;
                    }
                    _ => {
                        state
                            .send_to(
                                &client_id,
                                json!({"type": "error", "message": "Unknown message type."}),
                            )
                            .await;
                    }
                }
            }
            Message::Close(_) => {
                break;
            }
            _ => {}
        }
    }

    writer_task.abort();
    state_clone.handle_disconnect(&client_id_clone).await;
}

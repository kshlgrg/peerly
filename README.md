# PeerLy

PeerLy is a real-time anonymous student chat app with random matching, text chat, next/skip, lightweight reporting, and peer-to-peer WebRTC video. The UI uses a warm retro computer theme: amber glow, CRT scanlines, and compact terminal-style controls.

## Architecture

```text
React + Vite frontend
  -> FastAPI WebSocket control layer
  -> WebRTC peer-to-peer media layer
```

The backend handles matching, text relay, and WebRTC signaling. Video and audio flow directly between browsers after the offer, answer, and ICE exchange.

## Features

- Random queue-based matching for text and video rooms.
- Realtime text chat over WebSockets.
- Next/skip flow that avoids immediately rematching the same pair.
- WebRTC offer, answer, and ICE signaling for peer-to-peer media.
- Report control with short-lived in-memory report capture.
- Responsive retro CRT interface for desktop and mobile.
- Production env configuration for hosted origins and WebSocket URLs.

## Run Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check: `http://localhost:8000/health`

Backend environment:

```bash
cp backend/.env.example backend/.env
```

Set these in production:

- `PEERLY_CORS_ORIGINS`: comma-separated frontend origins, for example `https://peerly-web.onrender.com`
- `PEERLY_WS_ORIGINS`: comma-separated WebSocket origins, usually the same as `PEERLY_CORS_ORIGINS`

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

Frontend environment:

```bash
cp frontend/.env.example frontend/.env
```

Set `VITE_WS_URL` in production, for example `wss://peerly-api.onrender.com/ws`.

## Test Locally

1. Start both servers.
2. Open two browser tabs at `http://localhost:5173`.
3. Pick the same mode in both tabs.
4. Use **Next** to break and rematch.

For video chat, allow camera and microphone permissions in both tabs.

## Deploy

The repo includes:

- `render.yaml` for a two-service Render deployment.
- `backend/Dockerfile` for the FastAPI service.
- `frontend/Dockerfile` and `frontend/nginx.conf` for static frontend hosting.
- `.env.example` files for required production values.

### Render Blueprint

1. Push this repo to GitHub.
2. In Render, create a new Blueprint from the repository.
3. After Render creates both services, set:
   - `peerly-api` env vars:
     - `PEERLY_CORS_ORIGINS=https://YOUR_FRONTEND_HOST`
     - `PEERLY_WS_ORIGINS=https://YOUR_FRONTEND_HOST`
   - `peerly-web` env var:
     - `VITE_WS_URL=wss://YOUR_BACKEND_HOST/ws`
4. Redeploy the frontend after setting `VITE_WS_URL`, because Vite embeds it at build time.

### Other Hosts

Host `frontend/dist` on any static host after running `npm run build`. Host the backend on any Python service that supports WebSockets with this start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## WebSocket Protocol

Client messages:

```json
{ "type": "join", "mode": "text" }
{ "type": "message", "data": "hi" }
{ "type": "offer", "data": {} }
{ "type": "answer", "data": {} }
{ "type": "ice", "data": {} }
{ "type": "report", "data": "reason" }
{ "type": "next" }
```

Server messages:

```json
{ "type": "connected", "clientId": "..." }
{ "type": "waiting", "mode": "text" }
{ "type": "matched", "mode": "text", "initiator": true }
{ "type": "partner_left", "reason": "disconnect" }
{ "type": "reported", "message": "Report received." }
{ "type": "error", "message": "..." }
```

## Safety Notes

PeerLy does not persist chat logs. Reports are held in memory only in this MVP, so production abuse review should add persistent report storage, rate limits, CAPTCHA or campus SSO, and a clear safety notice before public launch.

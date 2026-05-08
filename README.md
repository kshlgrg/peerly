# PeerLy

PeerLy is a real-time anonymous student chat and video app with random matching, instant skip, retro CRT visuals, and peer-to-peer WebRTC video.

- Live app: https://peerly-web.onrender.com
- API health: https://peerly-api.onrender.com/health

## Contributors

PeerLy is maintained as a collaborative project.

- Roshni Singh ([@RoshniSingh0116](https://github.com/RoshniSingh0116))
- Tishika ([@tishika25552-sys](https://github.com/tishika25552-sys))

See [CONTRIBUTING.md](CONTRIBUTING.md) for the basic checklist before opening changes.

## What It Does

- Matches students randomly into one-on-one text or video rooms.
- Sends chat messages instantly over WebSockets.
- Uses WebRTC for direct peer-to-peer camera and microphone streams.
- Lets users skip with **Next** and get rematched.
- Includes a small report flow for lightweight moderation.
- Ships with a warm Gen Z retro-computer interface: CRT scanlines, terminal panels, amber glow, savage little micro-toys, and mobile-friendly layouts.

## App Flow

1. Pick text or video mode from the home screen.
2. Join the live queue and wait for a peer match.
3. Chat, play a quick mini-game, or start a video room.
4. Use **Next** to leave the current room and return to matching.

## Tech Stack

**Frontend**

- React
- Vite
- Tailwind CSS
- Zustand
- WebRTC browser APIs

**Backend**

- FastAPI
- Native WebSockets
- Python async matching/signaling logic
- In-memory queues and session state for MVP speed

**Hosting**

- Render static web service for the frontend
- Render web service for the FastAPI backend

## Architecture

```text
React frontend
  -> WebSocket control layer
  -> FastAPI matching + signaling server
  -> WebRTC peer-to-peer media
```

The backend handles matching, text relay, disconnects, reports, and WebRTC signaling messages. Video and audio do **not** stream through the backend after connection setup; browsers exchange media directly through WebRTC.

## Current Features

- Random queue-based matching by mode.
- Text chat with realtime delivery.
- Video chat with offer, answer, and ICE signaling.
- Next/skip flow with partner cleanup.
- Disconnect handling.
- Report button.
- Retro video filters, including an Alien mode with green/wide video and outgoing voice modulation.
- Cheese mode in text chat with one-click chaotic openers.
- Side chat inside video mode.
- Responsive home page with small interactive widgets.
- Production CORS and WebSocket origin configuration.

## Live Testing

To test the deployed app:

1. Open https://peerly-web.onrender.com on two devices or two browser profiles.
2. Pick the same mode on both devices.
3. For text mode, send messages both ways.
4. For video mode, allow camera and microphone access on both devices.
5. Press **Next** on one device and confirm the other device returns to waiting.

If the free Render backend is sleeping, the first connection can take a short moment to wake up.

## Local Development

Prerequisites:

- Node.js 18 or newer for the Vite frontend.
- Python 3.11 or newer for the FastAPI backend.
- Two browser profiles or devices when testing live matching locally.

Quick checks before opening a pull request:

```bash
cd frontend
npm run lint
npm run build
```

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check:

```text
http://localhost:8000/health
```

Optional local backend env:

```bash
cp backend/.env.example backend/.env
```

Production backend env:

```bash
PEERLY_CORS_ORIGINS=https://peerly-web.onrender.com
PEERLY_WS_ORIGINS=https://peerly-web.onrender.com
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

Optional local frontend env:

```bash
cp frontend/.env.example frontend/.env
```

Production frontend env:

```bash
VITE_WS_URL=wss://peerly-api.onrender.com/ws
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

## Deploy

The repo includes a Render Blueprint:

- `render.yaml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `frontend/nginx.conf`

Render services:

- Frontend: https://peerly-web.onrender.com
- Backend: https://peerly-api.onrender.com

After changing frontend environment variables, redeploy the frontend because Vite embeds `VITE_WS_URL` at build time.

## Database Notes

PeerLy currently does **not** need a database for the core MVP because matching, chat relay, and WebRTC signaling are temporary realtime events.

Add Supabase, Postgres, or another database when you want:

- Persistent reports.
- Moderation review history.
- Campus email verification.
- Interest tags.
- Bans or rate-limit records.
- User preferences.

For a public student launch, persistent reports and rate limiting should come before serious growth.

## Safety Notes

- PeerLy does not persist chat logs in the MVP.
- Reports are currently lightweight and should become persistent before public moderation use.
- Production hardening should add rate limits, CAPTCHA or campus SSO, persistent report storage, abuse review tools, and a visible safety notice.
- Do not secretly record users. Keep safety controls explicit.

## Roadmap

- Persistent moderation reports.
- Interest tags.
- Better queue states.
- Campus-only login option.
- TURN server support for stricter networks.
- More retro video filters.
- Optional Supabase-backed moderation dashboard.

## Suggested GitHub Topics

`react`, `vite`, `fastapi`, `websocket`, `webrtc`, `tailwindcss`, `zustand`, `render`, `student-chat`, `peer-to-peer`

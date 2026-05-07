# PeerLy Backend

FastAPI WebSocket server for PeerLy matching, text relay, and WebRTC signaling.

## Run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The WebSocket endpoint is available at `ws://localhost:8000/ws`.

Health check:

```text
http://localhost:8000/health
```

## Production

Set these environment variables on the host:

```bash
PEERLY_CORS_ORIGINS=https://your-frontend-host
PEERLY_WS_ORIGINS=https://your-frontend-host
```

Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

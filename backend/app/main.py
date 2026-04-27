import asyncio
import json
import os
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="PeerLy API")


def csv_env(name: str, default: str) -> list[str]:
    raw_value = os.getenv(name, default)
    return [value.strip() for value in raw_value.split(",") if value.strip()]


CORS_ORIGINS = csv_env(
    "PEERLY_CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
)
ALLOWED_WS_ORIGINS = set(csv_env("PEERLY_WS_ORIGINS", ",".join(CORS_ORIGINS)))
ALLOW_ANY_WS_ORIGIN = "*" in ALLOWED_WS_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in CORS_ORIGINS else CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@dataclass
class Client:
    id: str
    websocket: WebSocket
    mode: str | None = None


class ConnectionManager:
    def __init__(self) -> None:
        self.clients: dict[str, Client] = {}
        self.waiting: dict[str, deque[str]] = {"text": deque(), "video": deque()}
        self.partners: dict[str, str] = {}
        self.skip_blocks: dict[str, set[str]] = {}
        self.reports: deque[dict[str, Any]] = deque(maxlen=250)
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> Client:
        await websocket.accept()
        client = Client(id=str(uuid4()), websocket=websocket)
        async with self.lock:
            self.clients[client.id] = client

        await self.send(client.id, {"type": "connected", "clientId": client.id})
        return client

    async def disconnect(self, client_id: str) -> None:
        partner_to_requeue: str | None = None
        partner_mode: str | None = None

        async with self.lock:
            client = self.clients.pop(client_id, None)
            self._remove_from_waiting_unlocked(client_id)
            self.skip_blocks.pop(client_id, None)
            for blocked_ids in self.skip_blocks.values():
                blocked_ids.discard(client_id)

            partner_id = self.partners.pop(client_id, None)
            if partner_id:
                self.partners.pop(partner_id, None)
                partner = self.clients.get(partner_id)
                if partner:
                    partner_to_requeue = partner_id
                    partner_mode = partner.mode

        if partner_to_requeue:
            await self.send(
                partner_to_requeue,
                {
                    "type": "partner_left",
                    "reason": "disconnect",
                    "message": "Your peer disconnected. Looking for a new match...",
                },
            )
            if partner_mode:
                await self.join(partner_to_requeue, partner_mode)

    async def join(self, client_id: str, mode: str) -> None:
        if mode not in self.waiting:
            await self.send(client_id, {"type": "error", "message": "Unknown chat mode."})
            return

        matched_pair: tuple[str, str] | None = None
        async with self.lock:
            client = self.clients.get(client_id)
            if not client:
                return

            client.mode = mode
            self._remove_from_waiting_unlocked(client_id)
            self._break_pair_unlocked(client_id)

            waiting_id = self._pop_match_unlocked(client_id, mode)
            if waiting_id:
                self.partners[client_id] = waiting_id
                self.partners[waiting_id] = client_id
                matched_pair = (waiting_id, client_id)
            else:
                self.waiting[mode].append(client_id)

        if matched_pair:
            first_id, second_id = matched_pair
            await self.send(
                first_id,
                {"type": "matched", "mode": mode, "initiator": True, "matchedAt": now_iso()},
            )
            await self.send(
                second_id,
                {"type": "matched", "mode": mode, "initiator": False, "matchedAt": now_iso()},
            )
        else:
            await self.send(client_id, {"type": "waiting", "mode": mode})

    async def next(self, client_id: str) -> None:
        mode: str | None = None
        affected: list[str] = []

        async with self.lock:
            client = self.clients.get(client_id)
            if not client:
                return

            mode = client.mode
            affected = self._break_pair_unlocked(client_id)
            if len(affected) == 2:
                self._block_recent_pair_unlocked(affected[0], affected[1])
            self._remove_from_waiting_unlocked(client_id)

        for affected_id in affected:
            if affected_id != client_id:
                await self.send(
                    affected_id,
                    {
                        "type": "partner_left",
                        "reason": "next",
                        "message": "Your peer skipped. Looking for a new match...",
                    },
                )

        if mode:
            for affected_id in affected or [client_id]:
                if affected_id in self.clients:
                    await self.join(affected_id, mode)

    async def relay(self, sender_id: str, payload: dict[str, Any]) -> None:
        async with self.lock:
            partner_id = self.partners.get(sender_id)

        if not partner_id:
            await self.send(sender_id, {"type": "error", "message": "No peer connected yet."})
            return

        message_type = payload.get("type")
        data = payload.get("data")
        outgoing: dict[str, Any] = {"type": message_type, "data": data, "from": sender_id}
        if message_type == "message":
            outgoing["sentAt"] = now_iso()

        await self.send(partner_id, outgoing)

    async def report(self, reporter_id: str, reason: str) -> None:
        clean_reason = str(reason)[:280]
        async with self.lock:
            partner_id = self.partners.get(reporter_id)
            self.reports.append(
                {
                    "reporterId": reporter_id,
                    "reportedId": partner_id,
                    "reason": clean_reason,
                    "createdAt": now_iso(),
                }
            )

        await self.send(
            reporter_id,
            {
                "type": "reported",
                "message": "Report received. You can press Next to leave this match.",
            },
        )

    async def send(self, client_id: str, payload: dict[str, Any]) -> None:
        client = self.clients.get(client_id)
        if not client:
            return

        try:
            await client.websocket.send_json(payload)
        except RuntimeError:
            await self.disconnect(client_id)

    def _remove_from_waiting_unlocked(self, client_id: str) -> None:
        for mode, queue in self.waiting.items():
            self.waiting[mode] = deque(waiting_id for waiting_id in queue if waiting_id != client_id)

    def _break_pair_unlocked(self, client_id: str) -> list[str]:
        partner_id = self.partners.pop(client_id, None)
        if not partner_id:
            return [client_id]

        self.partners.pop(partner_id, None)
        return [client_id, partner_id]

    def _pop_match_unlocked(self, client_id: str, mode: str) -> str | None:
        queue = self.waiting[mode]
        remaining: deque[str] = deque()
        match_id: str | None = None

        while queue:
            waiting_id = queue.popleft()
            if waiting_id not in self.clients or waiting_id == client_id:
                continue

            blocked_for_client = waiting_id in self.skip_blocks.get(client_id, set())
            blocked_for_waiting = client_id in self.skip_blocks.get(waiting_id, set())
            if not match_id and not blocked_for_client and not blocked_for_waiting:
                match_id = waiting_id
                continue

            remaining.append(waiting_id)

        self.waiting[mode] = remaining
        return match_id

    def _block_recent_pair_unlocked(self, first_id: str, second_id: str) -> None:
        self.skip_blocks.setdefault(first_id, set()).add(second_id)
        self.skip_blocks.setdefault(second_id, set()).add(first_id)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


manager = ConnectionManager()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
async def root() -> dict[str, str]:
    return {"name": "PeerLy API", "status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    origin = websocket.headers.get("origin")
    if origin and not ALLOW_ANY_WS_ORIGIN and origin not in ALLOWED_WS_ORIGINS:
        await websocket.close(code=1008)
        return

    client = await manager.connect(websocket)
    try:
        while True:
            raw_message = await websocket.receive_text()
            try:
                payload = json.loads(raw_message)
            except json.JSONDecodeError:
                await manager.send(client.id, {"type": "error", "message": "Invalid JSON."})
                continue

            message_type = payload.get("type")
            if message_type == "join":
                await manager.join(client.id, payload.get("mode", "text"))
            elif message_type == "next":
                await manager.next(client.id)
            elif message_type == "report":
                await manager.report(client.id, payload.get("data", "No reason provided."))
            elif message_type in {"message", "offer", "answer", "ice"}:
                if message_type == "message" and len(str(payload.get("data", ""))) > 1200:
                    await manager.send(client.id, {"type": "error", "message": "Message is too long."})
                    continue
                await manager.relay(client.id, payload)
            else:
                await manager.send(client.id, {"type": "error", "message": "Unknown message type."})
    except WebSocketDisconnect:
        await manager.disconnect(client.id)

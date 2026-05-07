import asyncio
import json
import os
import random
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
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
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
        # Avoid immediately pairing the same two users after one of them skips.
        self.skip_blocks: dict[str, set[str]] = {}
        # Temporary moderation queue until reports move to persistent storage.
        self.reports: deque[dict[str, Any]] = deque(maxlen=250)
        self.games: dict[str, dict[str, Any]] = {}
        self.video_requests: dict[str, str] = {}
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
                self.games.pop(pair_key(client_id, partner_id), None)
                self.video_requests.pop(pair_key(client_id, partner_id), None)
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
                    "message": "They vanished. The queue is finding someone less dramatic...",
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
                        "message": "They skipped. Their loss, obviously...",
                    },
                )

        if mode:
            for affected_id in affected or [client_id]:
                if affected_id in self.clients:
                    await self.join(affected_id, mode)

    async def game(self, sender_id: str, payload: dict[str, Any]) -> None:
        error_message: str | None = None
        sender_state: dict[str, Any] | None = None
        partner_state: dict[str, Any] | None = None
        partner_id: str | None = None

        async with self.lock:
            partner_id = self.partners.get(sender_id)
            if not partner_id:
                error_message = "Match first, then cook."
            else:
                key = pair_key(sender_id, partner_id)
                action = payload.get("action")
                game_type = payload.get("game")
                move = payload.get("move", {})

                if action == "start":
                    game = self._new_game_unlocked(game_type, sender_id, partner_id)
                    self.games[key] = game
                else:
                    game = self.games.get(key)
                    if not game:
                        error_message = "Start a game first."
                    else:
                        error_message = self._apply_game_move_unlocked(game, sender_id, move)

                if not error_message:
                    state = public_game_state(self.games[key], sender_id, partner_id)
                    sender_state = state["sender"]
                    partner_state = state["partner"]

        if error_message:
            await self.send(sender_id, {"type": "game_error", "message": error_message})
            return
        if sender_state and partner_state and partner_id:
            await self.send(sender_id, {"type": "game_state", "data": sender_state})
            await self.send(partner_id, {"type": "game_state", "data": partner_state})

    async def request_video_upgrade(self, sender_id: str) -> None:
        partner_id: str | None = None
        async with self.lock:
            sender = self.clients.get(sender_id)
            partner_id = self.partners.get(sender_id)
            partner = self.clients.get(partner_id) if partner_id else None
            if not sender or not partner_id or not partner:
                partner_id = None
            else:
                self.video_requests[pair_key(sender_id, partner_id)] = sender_id

        if not partner_id:
            await self.send(sender_id, {"type": "error", "message": "Match first, then request the face reveal."})
            return

        requested_at = now_iso()
        await self.send(
            sender_id,
            {
                "type": "video_request_sent",
                "requestedAt": requested_at,
                "message": "Video request sent. Now we wait to see if your aura has clearance.",
            },
        )
        await self.send(
            partner_id,
            {
                "type": "video_request",
                "requestedAt": requested_at,
                "message": "They want to upgrade to video. Accept only if the vibe survived inspection.",
            },
        )

    async def respond_video_upgrade(self, sender_id: str, accepted: bool) -> None:
        requester_id: str | None = None
        async with self.lock:
            responder = self.clients.get(sender_id)
            requester_id = self.partners.get(sender_id)
            requester = self.clients.get(requester_id) if requester_id else None
            if not responder or not requester_id or not requester:
                requester_id = None
            else:
                key = pair_key(sender_id, requester_id)
                pending_requester_id = self.video_requests.get(key)
                if pending_requester_id != requester_id:
                    requester_id = None
                else:
                    self.video_requests.pop(key, None)

        if not requester_id:
            await self.send(sender_id, {"type": "error", "message": "No video request is waiting. The drama expired."})
            return

        if not accepted:
            responded_at = now_iso()
            await self.send(
                sender_id,
                {
                    "type": "video_request_resolved",
                    "accepted": False,
                    "respondedAt": responded_at,
                    "message": "You declined. Boundaries remain undefeated.",
                },
            )
            await self.send(
                requester_id,
                {
                    "type": "video_request_resolved",
                    "accepted": False,
                    "respondedAt": responded_at,
                    "message": "Video request declined. Their camera said not today.",
                },
            )
            return

        await self.upgrade(requester_id, "video")

    async def upgrade(self, sender_id: str, mode: str) -> None:
        if mode != "video":
            await self.send(sender_id, {"type": "error", "message": "That upgrade path does not exist yet."})
            return

        partner_id: str | None = None
        async with self.lock:
            sender = self.clients.get(sender_id)
            partner_id = self.partners.get(sender_id)
            partner = self.clients.get(partner_id) if partner_id else None
            if not sender or not partner_id or not partner:
                partner_id = None
            else:
                sender.mode = mode
                partner.mode = mode
                self._remove_from_waiting_unlocked(sender_id)
                self._remove_from_waiting_unlocked(partner_id)
                self.video_requests.pop(pair_key(sender_id, partner_id), None)

        if not partner_id:
            await self.send(sender_id, {"type": "error", "message": "Match first, then escalate the eye contact."})
            return

        upgraded_at = now_iso()
        await self.send(
            sender_id,
            {
                "type": "mode_changed",
                "mode": mode,
                "initiator": True,
                "changedAt": upgraded_at,
                "message": "Video mode unlocked. The chat receipts survived.",
            },
        )
        await self.send(
            partner_id,
            {
                "type": "mode_changed",
                "mode": mode,
                "initiator": False,
                "changedAt": upgraded_at,
                "message": "They upgraded the room to video. The chat receipts survived.",
            },
        )

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
                "message": "Report locked. Hit Skip if the vibe is radioactive.",
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
        self.games.pop(pair_key(client_id, partner_id), None)
        self.video_requests.pop(pair_key(client_id, partner_id), None)
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

    def _new_game_unlocked(self, game_type: str, first_id: str, second_id: str) -> dict[str, Any]:
        if game_type == "connect_four":
            return {
                "type": "connect_four",
                "players": [first_id, second_id],
                "turn": first_id,
                "board": [[None for _ in range(7)] for _ in range(6)],
                "status": "playing",
                "winner": None,
                "message": "Connect Four started. Drop discs, not standards.",
            }

        if game_type == "dice_race":
            return {
                "type": "dice_race",
                "players": [first_id, second_id],
                "turn": first_id,
                "positions": {first_id: 0, second_id: 0},
                "lastRoll": None,
                "status": "playing",
                "winner": None,
                "message": "Dice Race started. Server rolls, no fake luck allowed.",
            }

        if game_type == "loot_tiles":
            values = list(range(1, 10))
            random.shuffle(values)
            return {
                "type": "loot_tiles",
                "players": [first_id, second_id],
                "turn": first_id,
                "values": values,
                "claimed": [None for _ in range(9)],
                "scores": {first_id: 0, second_id: 0},
                "status": "playing",
                "winner": None,
                "message": "Loot Tiles started. Pick tiles, collect points, trust no square.",
            }

        return {
            "type": "tic_tac_toe",
            "players": [first_id, second_id],
            "turn": first_id,
            "board": [None for _ in range(9)],
            "status": "playing",
            "winner": None,
            "message": "Tic Tac Toe started. Ancient game, modern ego damage.",
        }

    def _apply_game_move_unlocked(self, game: dict[str, Any], player_id: str, move: dict[str, Any]) -> str | None:
        if game["status"] != "playing":
            return "That game is already done. Start a new one."
        if game["turn"] != player_id:
            return "Not your turn. The queue of destiny says wait."

        game_type = game["type"]
        if game_type == "tic_tac_toe":
            return apply_tic_tac_toe_move(game, player_id, move)
        if game_type == "connect_four":
            return apply_connect_four_move(game, player_id, move)
        if game_type == "dice_race":
            return apply_dice_race_move(game, player_id)
        if game_type == "loot_tiles":
            return apply_loot_tiles_move(game, player_id, move)
        return "Unknown game."


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def pair_key(first_id: str, second_id: str) -> str:
    return "::".join(sorted([first_id, second_id]))


def other_player(game: dict[str, Any], player_id: str) -> str:
    return game["players"][1] if game["players"][0] == player_id else game["players"][0]


def player_mark(game: dict[str, Any], player_id: str) -> str:
    return "A" if game["players"][0] == player_id else "B"


def finish_or_switch_turn(game: dict[str, Any], winner: str | None, draw: bool = False) -> None:
    if winner:
        game["status"] = "finished"
        game["winner"] = winner
        game["message"] = "Game over. Someone's ego just took structural damage."
    elif draw:
        game["status"] = "finished"
        game["winner"] = "draw"
        game["message"] = "Draw. Nobody wins, everybody pretends that was strategy."
    else:
        game["turn"] = other_player(game, game["turn"])
        game["message"] = "Move accepted. Your turn, professor chaos."


def apply_tic_tac_toe_move(game: dict[str, Any], player_id: str, move: dict[str, Any]) -> str | None:
    index = move.get("index")
    if not isinstance(index, int) or index < 0 or index > 8:
        return "Pick a valid square."
    if game["board"][index] is not None:
        return "That square is taken. Cheating attempt denied."

    game["board"][index] = player_mark(game, player_id)
    winner_mark = winning_mark(game["board"], [(0, 1, 2), (3, 4, 5), (6, 7, 8), (0, 3, 6), (1, 4, 7), (2, 5, 8), (0, 4, 8), (2, 4, 6)])
    winner = player_for_mark(game, winner_mark)
    finish_or_switch_turn(game, winner, all(cell is not None for cell in game["board"]))
    return None


def apply_connect_four_move(game: dict[str, Any], player_id: str, move: dict[str, Any]) -> str | None:
    column = move.get("column")
    if not isinstance(column, int) or column < 0 or column > 6:
        return "Pick a valid column."

    board = game["board"]
    target_row = None
    for row in range(5, -1, -1):
        if board[row][column] is None:
            target_row = row
            break
    if target_row is None:
        return "That column is full. Gravity said no."

    board[target_row][column] = player_mark(game, player_id)
    winner_mark = connect_four_winner(board)
    winner = player_for_mark(game, winner_mark)
    draw = all(board[0][column_index] is not None for column_index in range(7))
    finish_or_switch_turn(game, winner, draw)
    return None


def apply_dice_race_move(game: dict[str, Any], player_id: str) -> str | None:
    roll = random.randint(1, 6)
    game["positions"][player_id] = min(24, game["positions"][player_id] + roll)
    game["lastRoll"] = {"player": player_mark(game, player_id), "value": roll}
    winner = player_id if game["positions"][player_id] >= 24 else None
    finish_or_switch_turn(game, winner)
    return None


def apply_loot_tiles_move(game: dict[str, Any], player_id: str, move: dict[str, Any]) -> str | None:
    index = move.get("index")
    if not isinstance(index, int) or index < 0 or index > 8:
        return "Pick a valid tile."
    if game["claimed"][index] is not None:
        return "That tile is already looted. Hands off."

    game["claimed"][index] = player_mark(game, player_id)
    game["scores"][player_id] += game["values"][index]
    if all(owner is not None for owner in game["claimed"]):
        first_id, second_id = game["players"]
        if game["scores"][first_id] == game["scores"][second_id]:
            finish_or_switch_turn(game, None, True)
        else:
            finish_or_switch_turn(game, first_id if game["scores"][first_id] > game["scores"][second_id] else second_id)
    else:
        finish_or_switch_turn(game, None)
    return None


def winning_mark(board: list[str | None], lines: list[tuple[int, int, int]]) -> str | None:
    for a, b, c in lines:
        if board[a] and board[a] == board[b] == board[c]:
            return board[a]
    return None


def connect_four_winner(board: list[list[str | None]]) -> str | None:
    directions = [(0, 1), (1, 0), (1, 1), (1, -1)]
    for row in range(6):
        for column in range(7):
            mark = board[row][column]
            if not mark:
                continue
            for row_step, column_step in directions:
                if all(
                    0 <= row + row_step * offset < 6
                    and 0 <= column + column_step * offset < 7
                    and board[row + row_step * offset][column + column_step * offset] == mark
                    for offset in range(4)
                ):
                    return mark
    return None


def player_for_mark(game: dict[str, Any], mark: str | None) -> str | None:
    if mark == "A":
        return game["players"][0]
    if mark == "B":
        return game["players"][1]
    return None


def public_game_state(game: dict[str, Any], sender_id: str, partner_id: str) -> dict[str, Any]:
    return {
        "sender": serialize_game(game, sender_id),
        "partner": serialize_game(game, partner_id),
    }


def serialize_game(game: dict[str, Any], viewer_id: str) -> dict[str, Any]:
    base = {
        "type": game["type"],
        "you": player_mark(game, viewer_id),
        "turn": player_mark(game, game["turn"]) if game.get("turn") else None,
        "status": game["status"],
        "winner": player_mark(game, game["winner"]) if game["winner"] not in {None, "draw"} else game["winner"],
        "message": game["message"],
    }
    if game["type"] in {"tic_tac_toe", "connect_four"}:
        base["board"] = game["board"]
    if game["type"] == "dice_race":
        base["positions"] = {player_mark(game, player_id): position for player_id, position in game["positions"].items()}
        base["lastRoll"] = game["lastRoll"]
        base["target"] = 24
    if game["type"] == "loot_tiles":
        base["claimed"] = game["claimed"]
        base["revealed"] = [value if owner is not None else None for value, owner in zip(game["values"], game["claimed"], strict=False)]
        base["scores"] = {player_mark(game, player_id): score for player_id, score in game["scores"].items()}
    return base


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
            elif message_type == "game":
                await manager.game(client.id, payload.get("data", {}))
            elif message_type == "video_request":
                await manager.request_video_upgrade(client.id)
            elif message_type == "video_response":
                await manager.respond_video_upgrade(client.id, bool(payload.get("accepted")))
            elif message_type == "upgrade":
                await manager.upgrade(client.id, payload.get("mode", "video"))
            elif message_type in {"message", "offer", "answer", "ice"}:
                if message_type == "message" and len(str(payload.get("data", ""))) > 1200:
                    await manager.send(client.id, {"type": "error", "message": "Essay detected. Trim it."})
                    continue
                await manager.relay(client.id, payload)
            else:
                await manager.send(client.id, {"type": "error", "message": "Unknown message type."})
    except WebSocketDisconnect:
        await manager.disconnect(client.id)

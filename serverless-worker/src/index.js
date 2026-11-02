// Cloudflare Serverless Edge Worker for PeerLy
// Provides global edge WebSocket matchmaking, WebRTC signaling, and game refereeing.

export class Matchmaker {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.clients = new Map(); // id -> { ws, mode, partnerId, ip, sessionId }
    this.waiting = { text: [], video: [] };
    this.skipBlocks = new Map(); // id -> Set(id)
    this.games = new Map(); // pairKey -> gameState
    this.videoRequests = new Map(); // pairKey -> requesterId
  }

  pairKey(a, b) {
    return [a, b].sort().join("::");
  }

  send(clientId, payload) {
    const client = this.clients.get(clientId);
    if (!client || !client.ws) return;
    try {
      client.ws.send(JSON.stringify(payload));
    } catch {
      this.disconnect(clientId);
    }
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", engine: "Cloudflare Serverless Edge" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response(JSON.stringify({ name: "PeerLy Serverless API", status: "ok" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
    const pair = new WebSocketPair();
    const [clientWs, serverWs] = Object.values(pair);

    serverWs.accept();
    const clientId = crypto.randomUUID();

    this.clients.set(clientId, {
      id: clientId,
      ws: serverWs,
      mode: null,
      partnerId: null,
      ip,
      sessionId: null
    });

    this.send(clientId, { type: "connected", clientId });

    serverWs.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data);
        this.handleMessage(clientId, payload);
      } catch {
        this.send(clientId, { type: "error", message: "Invalid JSON." });
      }
    });

    serverWs.addEventListener("close", () => {
      this.disconnect(clientId);
    });

    serverWs.addEventListener("error", () => {
      this.disconnect(clientId);
    });

    return new Response(null, {
      status: 101,
      webSocket: clientWs
    });
  }

  disconnect(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.clients.delete(clientId);

    // Remove from waiting queues
    this.waiting.text = this.waiting.text.filter(id => id !== clientId);
    this.waiting.video = this.waiting.video.filter(id => id !== clientId);

    // Remove skip blocks
    this.skipBlocks.delete(clientId);
    for (const [id, set] of this.skipBlocks.entries()) {
      set.delete(clientId);
    }

    // Handle partner
    const partnerId = client.partnerId;
    if (partnerId) {
      const partner = this.clients.get(partnerId);
      if (partner) {
        partner.partnerId = null;
        const pKey = this.pairKey(clientId, partnerId);
        this.games.delete(pKey);
        this.videoRequests.delete(pKey);

        this.send(partnerId, {
          type: "partner_left",
          reason: "disconnect",
          message: "They vanished. The queue is finding someone less dramatic..."
        });

        if (partner.mode) {
          this.join(partnerId, partner.mode);
        }
      }
    }
  }

  join(clientId, mode) {
    if (mode !== "text" && mode !== "video") {
      this.send(clientId, { type: "error", message: "Unknown chat mode." });
      return;
    }

    const client = this.clients.get(clientId);
    if (!client) return;

    client.mode = mode;

    // Remove from waiting queues
    this.waiting.text = this.waiting.text.filter(id => id !== clientId);
    this.waiting.video = this.waiting.video.filter(id => id !== clientId);

    // Break existing pair if any
    if (client.partnerId) {
      const oldPartner = this.clients.get(client.partnerId);
      if (oldPartner) oldPartner.partnerId = null;
      client.partnerId = null;
    }

    // Matchmaking logic
    const queue = this.waiting[mode];
    let matchId = null;
    const clientBlocks = this.skipBlocks.get(clientId) || new Set();

    const remaining = [];
    for (const candidateId of queue) {
      if (!this.clients.has(candidateId) || candidateId === clientId) continue;
      const candidateBlocks = this.skipBlocks.get(candidateId) || new Set();

      if (!matchId && !clientBlocks.has(candidateId) && !candidateBlocks.has(clientId)) {
        matchId = candidateId;
      } else {
        remaining.push(candidateId);
      }
    }

    this.waiting[mode] = remaining;

    if (matchId) {
      const partner = this.clients.get(matchId);
      client.partnerId = matchId;
      partner.partnerId = clientId;

      const sessionId = crypto.randomUUID();
      const matchedAt = new Date().toISOString();
      client.sessionId = sessionId;
      partner.sessionId = sessionId;

      this.send(matchId, {
        type: "matched",
        mode,
        initiator: true,
        matchedAt
      });

      this.send(clientId, {
        type: "matched",
        mode,
        initiator: false,
        matchedAt
      });
    } else {
      this.waiting[mode].push(clientId);
      this.send(clientId, { type: "waiting", mode });
    }
  }

  next(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const mode = client.mode;
    const partnerId = client.partnerId;

    if (partnerId) {
      const partner = this.clients.get(partnerId);
      if (partner) {
        partner.partnerId = null;
        const pKey = this.pairKey(clientId, partnerId);
        this.games.delete(pKey);
        this.videoRequests.delete(pKey);

        // Add skip block so they don't rematch immediately
        if (!this.skipBlocks.has(clientId)) this.skipBlocks.set(clientId, new Set());
        if (!this.skipBlocks.has(partnerId)) this.skipBlocks.set(partnerId, new Set());
        this.skipBlocks.get(clientId).add(partnerId);
        this.skipBlocks.get(partnerId).add(clientId);

        this.send(partnerId, {
          type: "partner_left",
          reason: "next",
          message: "They skipped. Their loss, obviously..."
        });

        if (mode && this.clients.has(partnerId)) {
          this.join(partnerId, mode);
        }
      }
      client.partnerId = null;
    }

    if (mode && this.clients.has(clientId)) {
      this.join(clientId, mode);
    }
  }

  handleMessage(clientId, payload) {
    const type = payload.type;
    switch (type) {
      case "join":
        this.join(clientId, payload.mode || "text");
        break;
      case "next":
        this.next(clientId);
        break;
      case "report":
        this.send(clientId, {
          type: "reported",
          message: "Report locked. Hit Skip if the vibe is radioactive."
        });
        break;
      case "video_request":
        this.handleVideoRequest(clientId);
        break;
      case "video_response":
        this.handleVideoResponse(clientId, Boolean(payload.accepted));
        break;
      case "upgrade":
        this.handleUpgrade(clientId, payload.mode || "video");
        break;
      case "game":
        this.handleGame(clientId, payload.data || {});
        break;
      case "message":
      case "offer":
      case "answer":
      case "ice":
        this.handleRelay(clientId, payload);
        break;
      default:
        this.send(clientId, { type: "error", message: "Unknown message type." });
    }
  }

  handleVideoRequest(senderId) {
    const sender = this.clients.get(senderId);
    if (!sender || !sender.partnerId) {
      this.send(senderId, { type: "error", message: "Match first, then request video." });
      return;
    }

    const partnerId = sender.partnerId;
    const key = this.pairKey(senderId, partnerId);
    this.videoRequests.set(key, senderId);

    const requestedAt = new Date().toISOString();
    this.send(senderId, {
      type: "video_request_sent",
      requestedAt,
      message: "Video request sent. Now we wait to see if your aura has clearance."
    });
    this.send(partnerId, {
      type: "video_request",
      requestedAt,
      message: "They want to upgrade to video. Accept only if the vibe survived inspection."
    });
  }

  handleVideoResponse(senderId, accepted) {
    const sender = this.clients.get(senderId);
    if (!sender || !sender.partnerId) return;

    const requesterId = sender.partnerId;
    const key = this.pairKey(senderId, requesterId);

    if (this.videoRequests.get(key) !== requesterId) return;
    this.videoRequests.delete(key);

    if (accepted) {
      this.handleUpgrade(requesterId, "video");
    } else {
      const respondedAt = new Date().toISOString();
      this.send(senderId, {
        type: "video_request_resolved",
        accepted: false,
        respondedAt,
        message: "You declined. Boundaries remain undefeated."
      });
      this.send(requesterId, {
        type: "video_request_resolved",
        accepted: false,
        respondedAt,
        message: "Video request declined. Their camera said not today."
      });
    }
  }

  handleUpgrade(senderId, mode) {
    if (mode !== "video") return;
    const sender = this.clients.get(senderId);
    if (!sender || !sender.partnerId) return;

    const partnerId = sender.partnerId;
    const partner = this.clients.get(partnerId);
    if (!partner) return;

    sender.mode = mode;
    partner.mode = mode;

    this.waiting.text = this.waiting.text.filter(id => id !== senderId && id !== partnerId);
    this.waiting.video = this.waiting.video.filter(id => id !== senderId && id !== partnerId);

    const changedAt = new Date().toISOString();
    this.send(senderId, {
      type: "mode_changed",
      mode: "video",
      initiator: true,
      changedAt,
      message: "Video mode unlocked. The chat receipts survived."
    });
    this.send(partnerId, {
      type: "mode_changed",
      mode: "video",
      initiator: false,
      changedAt,
      message: "They upgraded the room to video. The chat receipts survived."
    });
  }

  handleRelay(senderId, payload) {
    const sender = this.clients.get(senderId);
    if (!sender || !sender.partnerId) {
      this.send(senderId, { type: "error", message: "No peer connected yet." });
      return;
    }

    const partnerId = sender.partnerId;
    const outgoing = {
      type: payload.type,
      data: payload.data,
      from: senderId
    };

    if (payload.type === "message") {
      if (String(payload.data || "").length > 1200) {
        this.send(senderId, { type: "error", message: "Essay detected. Trim it." });
        return;
      }
      outgoing.sentAt = new Date().toISOString();
    }

    this.send(partnerId, outgoing);
  }

  handleGame(senderId, payload) {
    const sender = this.clients.get(senderId);
    if (!sender || !sender.partnerId) {
      this.send(senderId, { type: "game_error", message: "Match first, then cook." });
      return;
    }

    const partnerId = sender.partnerId;
    const key = this.pairKey(senderId, partnerId);
    const action = payload.action;
    const gameType = payload.game || "tic_tac_toe";
    const move = payload.move || {};

    let game = this.games.get(key);

    if (action === "start") {
      game = this.newGame(gameType, senderId, partnerId);
      this.games.set(key, game);
    } else if (!game) {
      this.send(senderId, { type: "game_error", message: "Start a game first." });
      return;
    } else {
      const err = this.applyGameMove(game, senderId, move);
      if (err) {
        this.send(senderId, { type: "game_error", message: err });
        return;
      }
    }

    const sState = this.serializeGame(game, senderId);
    const pState = this.serializeGame(game, partnerId);

    this.send(senderId, { type: "game_state", data: sState });
    this.send(partnerId, { type: "game_state", data: pState });
  }

  newGame(type, p1, p2) {
    if (type === "connect_four") {
      return {
        type: "connect_four",
        players: [p1, p2],
        turn: p1,
        board: Array(6).fill(null).map(() => Array(7).fill(null)),
        status: "playing",
        winner: null,
        message: "Connect Four started. Drop discs, not standards."
      };
    }
    if (type === "dice_race") {
      return {
        type: "dice_race",
        players: [p1, p2],
        turn: p1,
        positions: { [p1]: 0, [p2]: 0 },
        lastRoll: null,
        status: "playing",
        winner: null,
        message: "Dice Race started. Server rolls, no fake luck allowed."
      };
    }
    if (type === "loot_tiles") {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
      return {
        type: "loot_tiles",
        players: [p1, p2],
        turn: p1,
        values,
        claimed: Array(9).fill(null),
        scores: { [p1]: 0, [p2]: 0 },
        status: "playing",
        winner: null,
        message: "Loot Tiles started. Pick tiles, collect points, trust no square."
      };
    }
    if (type === "hot_takes") {
      const questions = [
        "Pineapple belongs on pizza and haters are cowardice personified.",
        "Voice notes longer than 20 seconds are an unsolicited podcast.",
        "Leaving people on read is a fundamental human right.",
        "Dark mode is superior even in direct sunlight.",
        "AI tools write cleaner code than 80% of humans.",
        "8 AM lectures should be banned under international conventions."
      ].sort(() => Math.random() - 0.5);
      return {
        type: "hot_takes",
        players: [p1, p2],
        currentQuestion: 0,
        questions,
        votes: { [p1]: null, [p2]: null },
        vibeScore: 0,
        status: "playing",
        winner: null,
        message: "Vibe Check started. Vote honestly or face eternal cringe."
      };
    }
    if (type === "scribble") {
      const words = ["AIRPODS", "RED FLAG", "CAFFEINE", "GHOST", "ALL NIGHTER", "CHAI", "CAT", "BRAINROT"];
      return {
        type: "scribble",
        players: [p1, p2],
        drawer: p1,
        word: words[Math.floor(Math.random() * words.length)],
        strokes: [],
        scores: { [p1]: 0, [p2]: 0 },
        status: "playing",
        winner: null,
        message: "Scribble started! Drawer: draw the word. Guesser: guess in chat!"
      };
    }
    if (type === "truth_dare") {
      return {
        type: "truth_dare",
        players: [p1, p2],
        turn: p1,
        choice: null,
        prompt: null,
        aura: { [p1]: 1000, [p2]: 1000 },
        status: "playing",
        winner: null,
        message: "Truth or Dare initiated. Pick your poison or lose aura."
      };
    }
    // Default Tic Tac Toe
    return {
      type: "tic_tac_toe",
      players: [p1, p2],
      turn: p1,
      board: Array(9).fill(null),
      status: "playing",
      winner: null,
      message: "Tic Tac Toe started. Ancient game, modern ego damage."
    };
  }

  applyGameMove(game, playerId, move) {
    if (game.status !== "playing") return "Game already done.";
    const p1 = game.players[0];
    const p2 = game.players[1];
    const other = playerId === p1 ? p2 : p1;
    const mark = playerId === p1 ? "A" : "B";

    if (game.type === "tic_tac_toe") {
      if (game.turn !== playerId) return "Not your turn.";
      const idx = move.index;
      if (typeof idx !== "number" || idx < 0 || idx > 8 || game.board[idx]) return "Invalid square.";
      game.board[idx] = mark;

      const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
      ];
      let won = lines.some(([a, b, c]) => game.board[a] && game.board[a] === game.board[b] && game.board[a] === game.board[c]);
      if (won) {
        game.status = "finished";
        game.winner = playerId;
        game.message = "Game over. Someone's ego took structural damage.";
      } else if (game.board.every(Boolean)) {
        game.status = "finished";
        game.winner = "draw";
        game.message = "Draw. Nobody wins, everybody pretends that was strategy.";
      } else {
        game.turn = other;
        game.message = "Move accepted. Your turn, professor chaos.";
      }
      return null;
    }

    if (game.type === "connect_four") {
      if (game.turn !== playerId) return "Not your turn.";
      const col = move.column;
      if (typeof col !== "number" || col < 0 || col > 6) return "Invalid column.";
      let targetRow = null;
      for (let r = 5; r >= 0; r--) {
        if (!game.board[r][col]) { targetRow = r; break; }
      }
      if (targetRow === null) return "Column full. Gravity said no.";
      game.board[targetRow][col] = mark;

      // Win check
      let win = false;
      const dirs = [[0,1],[1,0],[1,1],[1,-1]];
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 7; c++) {
          if (game.board[r][c] === mark) {
            for (const [dr, dc] of dirs) {
              if ([1,2,3].every(step => {
                const nr = r + dr*step, nc = c + dc*step;
                return nr >= 0 && nr < 6 && nc >= 0 && nc < 7 && game.board[nr][nc] === mark;
              })) { win = true; break; }
            }
          }
        }
      }
      if (win) {
        game.status = "finished";
        game.winner = playerId;
        game.message = "Game over. Discs aligned, ego collapsed.";
      } else if (game.board[0].every(Boolean)) {
        game.status = "finished";
        game.winner = "draw";
        game.message = "Draw. Board full.";
      } else {
        game.turn = other;
        game.message = "Move accepted. Drop discs, not standards.";
      }
      return null;
    }

    if (game.type === "dice_race") {
      if (game.turn !== playerId) return "Not your turn.";
      const roll = Math.floor(Math.random() * 6) + 1;
      game.positions[playerId] = Math.min(24, game.positions[playerId] + roll);
      game.lastRoll = { player: mark, value: roll };
      if (game.positions[playerId] >= 24) {
        game.status = "finished";
        game.winner = playerId;
        game.message = "Game over. The blame cube has chosen a victor.";
      } else {
        game.turn = other;
        game.message = "Move accepted. Roll the cube.";
      }
      return null;
    }

    if (game.type === "loot_tiles") {
      if (game.turn !== playerId) return "Not your turn.";
      const idx = move.index;
      if (typeof idx !== "number" || idx < 0 || idx > 8 || game.claimed[idx]) return "Tile taken.";
      game.claimed[idx] = mark;
      game.scores[playerId] += game.values[idx];
      if (game.claimed.every(Boolean)) {
        game.status = "finished";
        game.winner = game.scores[p1] === game.scores[p2] ? "draw" : (game.scores[p1] > game.scores[p2] ? p1 : p2);
        game.message = "Loot tiles finished!";
      } else {
        game.turn = other;
        game.message = "Tile claimed. Next turn.";
      }
      return null;
    }

    if (game.type === "hot_takes") {
      if (typeof move.vote !== "boolean") return "Vote true or false.";
      game.votes[playerId] = move.vote;
      if (game.votes[p1] !== null && game.votes[p2] !== null) {
        if (game.votes[p1] === game.votes[p2]) {
          game.vibeScore += 1;
          game.message = "Vibe match! Both agreed.";
        } else {
          game.message = "Disagreement recorded. The simulation is fracturing.";
        }
        game.currentQuestion += 1;
        if (game.currentQuestion >= game.questions.length) {
          game.status = "finished";
          game.winner = "draw";
          game.message = `Vibe check complete! Score: ${game.vibeScore}/${game.questions.length}`;
        } else {
          game.votes[p1] = null;
          game.votes[p2] = null;
        }
      } else {
        game.message = "Vote locked. Waiting for partner...";
      }
      return null;
    }

    if (game.type === "scribble") {
      if (move.action === "stroke") {
        if (playerId !== game.drawer) return "Only drawer can draw.";
        if (move.data) game.strokes.push(move.data);
        return null;
      }
      if (move.action === "clear") {
        if (playerId === game.drawer) game.strokes = [];
        return null;
      }
      if (move.action === "guess") {
        if (playerId === game.drawer) return "Drawer cannot guess.";
        const guess = String(move.guess || "").trim().toUpperCase();
        if (guess === game.word) {
          game.scores[playerId] += 100;
          game.scores[game.drawer] += 50;
          game.message = `🔥 CORRECT! The word was ${game.word}. +100 Aura Points!`;
          const words = ["AIRPODS", "RED FLAG", "CAFFEINE", "GHOST", "ALL NIGHTER", "CHAI", "CAT", "BRAINROT"];
          game.word = words[Math.floor(Math.random() * words.length)];
          game.drawer = other;
          game.strokes = [];
        } else {
          game.message = `❌ '${guess}' is wrong! Keep guessing!`;
        }
        return null;
      }
      return "Unknown scribble move.";
    }

    if (game.type === "truth_dare") {
      if (move.action === "pick") {
        if (playerId !== game.turn) return "Not your turn.";
        game.choice = move.choice || "truth";
        if (game.choice === "truth") {
          const truths = [
            "What is the most delusional lie currently on your resume or IG?",
            "Have you stalked an ex or crush from a burner account this month?",
            "What is the pettiest reason you have ever ghosted or skipped someone?",
            "Rate your current mental stability out of 10 and defend your grade."
          ];
          game.prompt = truths[Math.floor(Math.random() * truths.length)];
        } else {
          const dares = [
            "Send the last photo taken in your camera roll right now in chat.",
            "Turn on mic and do your best unhinged impression of a campus professor.",
            "Text your best friend 'I know what you did' and do not reply for 5 minutes.",
            "Do 10 rapid pushups right now on camera or confess your biggest cringe moment."
          ];
          game.prompt = dares[Math.floor(Math.random() * dares.length)];
        }
        game.message = `Prompt delivered: ${game.choice.toUpperCase()}. Complete or chicken out?`;
        return null;
      }
      if (move.action === "complete") {
        if (playerId !== game.turn) return "Not your turn.";
        game.aura[playerId] += 500;
        game.message = "🔥 RESPECT! Prompt completed. +500 Aura Points!";
        game.turn = other;
        game.choice = null;
        game.prompt = null;
        return null;
      }
      if (move.action === "forfeit") {
        if (playerId !== game.turn) return "Not your turn.";
        game.aura[playerId] -= 500;
        game.message = "💀 CHICKENED OUT! -500 Aura Points. Emotional damage inflicted.";
        game.turn = other;
        game.choice = null;
        game.prompt = null;
        return null;
      }
      return "Unknown truth/dare move.";
    }

    return "Unknown game type.";
  }

  serializeGame(game, viewerId) {
    const p1 = game.players[0];
    const p2 = game.players[1];
    const you = viewerId === p1 ? "A" : "B";
    const turn = game.turn ? (game.turn === p1 ? "A" : "B") : you;
    const winner = game.winner ? (game.winner === "draw" ? "draw" : (game.winner === p1 ? "A" : "B")) : null;

    const base = {
      type: game.type,
      you,
      turn,
      status: game.status,
      winner,
      message: game.message
    };

    if (game.type === "tic_tac_toe" || game.type === "connect_four") {
      base.board = game.board;
    }
    if (game.type === "dice_race") {
      base.positions = { A: game.positions[p1], B: game.positions[p2] };
      base.lastRoll = game.lastRoll;
      base.target = 24;
    }
    if (game.type === "loot_tiles") {
      base.claimed = game.claimed;
      base.revealed = game.values.map((v, i) => game.claimed[i] ? v : null);
      base.scores = { A: game.scores[p1], B: game.scores[p2] };
    }
    if (game.type === "hot_takes") {
      base.question = game.questions[game.currentQuestion] || "";
      base.questionIndex = game.currentQuestion;
      base.totalQuestions = game.questions.length;
      base.myVote = game.votes[viewerId];
      base.vibeScore = game.vibeScore;
    }
    if (game.type === "scribble") {
      const isDrawer = viewerId === game.drawer;
      base.isDrawer = isDrawer;
      base.word = isDrawer ? game.word : game.word.replace(/[A-Z0-9]/g, "_");
      base.strokes = game.strokes;
      base.scores = { A: game.scores[p1], B: game.scores[p2] };
    }
    if (game.type === "truth_dare") {
      base.choice = game.choice;
      base.prompt = game.prompt;
      base.aura = { A: game.aura[p1], B: game.aura[p2] };
    }

    return base;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", engine: "Cloudflare Serverless Edge" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    if (request.headers.get("Upgrade") === "websocket") {
      const id = env.MATCHMAKER.idFromName("global_matchmaker");
      const obj = env.MATCHMAKER.get(id);
      return obj.fetch(request);
    }

    return new Response(JSON.stringify({ name: "PeerLy Serverless API", status: "ok" }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
};

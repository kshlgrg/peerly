import { Dice5, Gamepad2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { playAuraSound, playDamageSound } from "../utils/sfx.js";

// Each game entry contains the backend id, display label, and tiny UI description.
const games = [
  ["tic_tac_toe", "Tic Tac Toe", "Tiny board, loud ego funeral."],
  ["connect_four", "Connect Four", "Gravity doing emotional damage."],
  ["dice_race", "Dice Race", "Server rolls. Your excuses do not."],
  ["loot_tiles", "Loot Tiles", "Mystery points for suspicious people."],
  ["hot_takes", "Vibe Check", "Spicy campus takes. Agree or fight."],
  ["scribble", "Scribble", "Doodle chaos. Partner guesses."],
  ["truth_dare", "Truth or Dare", "Spicy campus dares. Lose aura."],
];

export default function MiniGames({ compact = false, disabled = false, gameState, gameError, onGame }) {
  // The backend sends whose turn it is; the UI only enables moves for that player.
  const isYourTurn = gameState?.status === "playing" && gameState?.turn === gameState?.you;

  // Start asks the server to create/reset the selected game for both peers.
  function start(game) {
    onGame?.({ action: "start", game });
  }

  // Move sends only the move payload; the server validates rules and broadcasts state.
  function move(moveData = {}) {
    onGame?.({ action: "move", move: moveData });
  }

  return (
    <section className={`terminal-panel bg-[#100014] p-3 font-mono uppercase ${compact ? "space-y-3" : "space-y-4"}`}>
      {/* Arcade heading makes it clear that game state is server-refereed. */}
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-black text-amber">
          <Gamepad2 size={15} aria-hidden="true" />
          matched room menace
        </p>
        <span className="text-xs font-black text-copper">server referees the nonsense</span>
      </div>

      {/* Game launcher list. Disabled while waiting so users cannot create orphan games. */}
      <div className={`grid gap-2 ${compact ? "grid-cols-2" : "sm:grid-cols-4"}`}>
        {games.map(([id, label, copy]) => (
          <button
            key={id}
            className="min-h-16 border-2 border-line bg-ink p-2 text-left transition hover:border-copper disabled:cursor-not-allowed disabled:opacity-45"
            type="button"
            onClick={() => start(id)}
            disabled={disabled}
          >
            <span className="block text-xs font-black text-amber">{label}</span>
            <span className="mt-1 block text-[10px] font-bold leading-4 text-cream/50">{copy}</span>
          </button>
        ))}
      </div>

      {/* Server-side validation errors, such as moving out of turn, appear here. */}
      {gameError && <p className="border-2 border-copper bg-ink p-2 text-xs font-black text-copper">{gameError}</p>}

      {!gameState ? (
        // Empty state before a game has been selected.
        <p className="border-2 border-line bg-ink p-3 text-xs font-bold leading-5 text-cream/55">
          Match first, then start a game. Skipping wipes the room state, because loopholes are for people with weak lore.
        </p>
      ) : (
        <div className="border-2 border-line bg-ink p-3">
          {/* Header shows current game, player mark, and turn/winner status. */}
          <GameHeader gameState={gameState} isYourTurn={isYourTurn} />
          {/* Render the correct board component based on the server's game type. */}
          {gameState.type === "tic_tac_toe" && <TicTacToe state={gameState} move={move} isYourTurn={isYourTurn} />}
          {gameState.type === "connect_four" && <ConnectFour state={gameState} move={move} isYourTurn={isYourTurn} />}
          {gameState.type === "dice_race" && <DiceRace state={gameState} move={move} isYourTurn={isYourTurn} />}
          {gameState.type === "loot_tiles" && <LootTiles state={gameState} move={move} isYourTurn={isYourTurn} />}
          {gameState.type === "hot_takes" && <HotTakes state={gameState} move={move} />}
          {gameState.type === "scribble" && <Scribble state={gameState} move={move} />}
          {gameState.type === "truth_dare" && <TruthOrDare state={gameState} move={move} isYourTurn={isYourTurn} />}
        </div>
      )}
    </section>
  );
}

function GameHeader({ gameState, isYourTurn }) {
  // Winner text compresses several backend states into one badge.
  const winnerText =
    gameState.winner === "draw"
      ? "draw"
      : gameState.winner
        ? gameState.winner === gameState.you
          ? "you won"
          : "you lost"
        : isYourTurn
          ? "your turn"
          : "their turn";

  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-black text-amber">
          {labelForGame(gameState.type)} | you are {gameState.you}, unfortunately
        </p>
        <p className="mt-1 text-[10px] font-bold leading-4 text-cream/50">{gameState.message}</p>
      </div>
      <span className="w-fit border-2 border-copper bg-copper px-2 py-1 text-xs font-black text-ink">{winnerText}</span>
    </div>
  );
}

function TicTacToe({ state, move, isYourTurn }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {/* The board is a flat nine-cell array; index is sent back as the move. */}
      {state.board.map((cell, index) => (
        <button
          key={index}
          className={`min-h-14 border-2 text-lg font-black ${cellClass(cell)}`}
          type="button"
          disabled={!isYourTurn || Boolean(cell)}
          onClick={() => move({ index })}
        >
          {cell ?? ""}
        </button>
      ))}
    </div>
  );
}

function ConnectFour({ state, move, isYourTurn }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1">
        {/* Column buttons drop a piece into the selected column. */}
        {Array.from({ length: 7 }, (_, column) => (
          <button
            key={column}
            className="border-2 border-line bg-amber py-1 text-xs font-black text-ink disabled:opacity-35"
            type="button"
            disabled={!isYourTurn || Boolean(state.board[0][column])}
            onClick={() => move({ column })}
          >
            v
          </button>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {/* The backend owns gravity and winner checks; this only paints the latest grid. */}
        {state.board.flatMap((row, rowIndex) =>
          row.map((cell, columnIndex) => (
            <span
              key={`${rowIndex}-${columnIndex}`}
              className={`flex aspect-square items-center justify-center rounded-full border-2 text-[10px] font-black ${cellClass(cell)}`}
            >
              {cell ?? ""}
            </span>
          )),
        )}
      </div>
    </div>
  );
}

function DiceRace({ state, move, isYourTurn }) {
  // Position defaults keep the UI stable while a new state arrives.
  const a = state.positions?.A ?? 0;
  const b = state.positions?.B ?? 0;
  const target = state.target ?? 24;

  return (
    <div className="space-y-3">
      <RaceBar label="A" value={a} target={target} mine={state.you === "A"} />
      <RaceBar label="B" value={b} target={target} mine={state.you === "B"} />
      {state.lastRoll && (
        <p className="text-xs font-black text-cream/60">
          Last roll: {state.lastRoll.player} rolled {state.lastRoll.value}. Math has chosen violence.
        </p>
      )}
      {/* Rolling sends an empty move because the server generates the random number. */}
      <button className="command-button min-h-10 w-full text-xs" type="button" disabled={!isYourTurn} onClick={() => move()}>
        <Dice5 size={14} aria-hidden="true" />
        roll the blame cube
      </button>
    </div>
  );
}

function LootTiles({ state, move, isYourTurn }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs font-black text-cream/70">
        <span>A loot: {state.scores?.A ?? 0}</span>
        <span>B loot: {state.scores?.B ?? 0}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {/* Players claim hidden tiles; the server reveals point values after each claim. */}
        {state.claimed.map((owner, index) => (
          <button
            key={index}
            className={`min-h-12 border-2 text-sm font-black ${cellClass(owner)}`}
            type="button"
            disabled={!isYourTurn || Boolean(owner)}
            onClick={() => move({ index })}
          >
            {state.revealed[index] ?? "??"}
          </button>
        ))}
      </div>
    </div>
  );
}

function HotTakes({ state, move }) {
  const hasVoted = state.myVote !== null && state.myVote !== undefined;

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs font-black text-cream/70">
        <span>Question {(state.questionIndex ?? 0) + 1}/{state.totalQuestions ?? 6}</span>
        <span className="text-amber">Vibe Score: {state.vibeScore ?? 0}</span>
      </div>
      <div className="border-2 border-line bg-[#120015] p-3 text-center">
        <p className="text-xs font-bold leading-5 text-amber">
          &ldquo;{state.question}&rdquo;
        </p>
      </div>
      {hasVoted ? (
        <p className="text-center text-xs font-bold text-copper">
          Vote locked ({state.myVote ? "AGREE" : "DISAGREE"}). Waiting for partner...
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            className="min-h-11 border-2 border-amber bg-amber font-mono text-xs font-black text-ink hover:opacity-90"
            type="button"
            onClick={() => move({ vote: true })}
          >
            Agree
          </button>
          <button
            className="min-h-11 border-2 border-copper bg-copper font-mono text-xs font-black text-ink hover:opacity-90"
            type="button"
            onClick={() => move({ vote: false })}
          >
            Disagree
          </button>
        </div>
      )}
    </div>
  );
}

function RaceBar({ label, value, target, mine }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-black text-cream/65">
        <span>
          {label}
          {mine ? " (you)" : ""}
        </span>
        <span>
          {value}/{target}
        </span>
      </div>
      <div className="h-4 border-2 border-line bg-[#120015]">
        {/* Width turns numeric race progress into a quick visual bar. */}
        <div className={label === "A" ? "h-full bg-amber" : "h-full bg-copper"} style={{ width: `${(value / target) * 100}%` }} />
      </div>
    </div>
  );
}

// Shared cell styling keeps all game boards visually consistent.
function cellClass(mark) {
  if (mark === "A") return "border-amber bg-amber text-ink";
  if (mark === "B") return "border-copper bg-copper text-ink";
  return "border-line bg-[#120015] text-amber";
}

// Converts the backend game id into a display label for headers.
function labelForGame(type) {
  return games.find(([id]) => id === type)?.[1] ?? "Game";
}

function Scribble({ state, move }) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [guessInput, setGuessInput] = useState("");
  const isDrawer = Boolean(state.isDrawer);

  // Redraw strokes whenever updated from server
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    (state.strokes || []).forEach((stroke) => {
      ctx.beginPath();
      ctx.strokeStyle = stroke.color || "#d9ff00";
      ctx.lineWidth = stroke.width || 3;
      (stroke.points || []).forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
    });
  }, [state.strokes]);

  const currentStrokeRef = useRef([]);

  function getCoords(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  function startDraw(e) {
    if (!isDrawer) return;
    isDrawingRef.current = true;
    const { x, y } = getCoords(e);
    currentStrokeRef.current = [{ x, y }];
  }

  function doDraw(e) {
    if (!isDrawer || !isDrawingRef.current) return;
    const { x, y } = getCoords(e);
    currentStrokeRef.current.push({ x, y });

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#d9ff00";
    ctx.lineWidth = 3;
    const pts = currentStrokeRef.current;
    if (pts.length > 1) {
      ctx.beginPath();
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }

  function stopDraw() {
    if (!isDrawer || !isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentStrokeRef.current.length > 0) {
      move({
        action: "stroke",
        data: {
          color: "#d9ff00",
          width: 3,
          points: currentStrokeRef.current,
        },
      });
      currentStrokeRef.current = [];
    }
  }

  function handleGuess(e) {
    e.preventDefault();
    if (!guessInput.trim()) return;
    move({ action: "guess", guess: guessInput.trim() });
    setGuessInput("");
  }

  return (
    <div className="space-y-3 font-mono">
      <div className="flex items-center justify-between text-xs font-black text-cream/70">
        <span>A: {state.scores?.A ?? 0} pts</span>
        <span className="text-amber">
          {isDrawer ? `DRAW: ${state.word}` : `GUESS: ${state.word}`}
        </span>
        <span>B: {state.scores?.B ?? 0} pts</span>
      </div>
      <div className="relative mx-auto w-full rounded border-2 border-line bg-ink p-1">
        <canvas
          ref={canvasRef}
          width={300}
          height={150}
          className="mx-auto block touch-none cursor-crosshair bg-[#0d0012]"
          onMouseDown={startDraw}
          onMouseMove={doDraw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={doDraw}
          onTouchEnd={stopDraw}
        />
      </div>
      {isDrawer ? (
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-cream/50">Draw on the canvas. Don&apos;t spoil in chat!</span>
          <button
            type="button"
            className="border border-line bg-ink px-2 py-1 text-[10px] font-black text-amber hover:border-amber"
            onClick={() => move({ action: "clear" })}
          >
            Clear Canvas
          </button>
        </div>
      ) : (
        <form onSubmit={handleGuess} className="flex gap-2">
          <input
            className="flex-1 rounded border border-line bg-ink px-3 py-1 font-mono text-xs text-cream outline-none focus:border-amber"
            placeholder="Type your guess here..."
            value={guessInput}
            onChange={(e) => setGuessInput(e.target.value)}
          />
          <button
            type="submit"
            className="border-2 border-amber bg-amber px-3 py-1 font-mono text-xs font-black text-ink hover:opacity-90"
          >
            Guess
          </button>
        </form>
      )}
    </div>
  );
}

function TruthOrDare({ state, move, isYourTurn }) {
  const hasPrompt = Boolean(state.prompt);

  function pick(choice) {
    move({ action: "pick", choice });
  }

  function handleComplete() {
    playAuraSound();
    move({ action: "complete" });
  }

  function handleForfeit() {
    playDamageSound();
    move({ action: "forfeit" });
  }

  return (
    <div className="space-y-3 font-mono">
      <div className="flex justify-between text-xs font-black text-cream/70">
        <span>A Aura: {state.aura?.A ?? 1000}</span>
        <span className="text-copper">⚡ Campus Edition</span>
        <span>B Aura: {state.aura?.B ?? 1000}</span>
      </div>

      {!hasPrompt ? (
        isYourTurn ? (
          <div className="space-y-2 text-center">
            <p className="text-xs font-bold text-amber">Your turn! Choose your test of courage:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => pick("truth")}
                className="min-h-12 border-2 border-amber bg-amber font-mono text-xs font-black text-ink hover:bg-copper transition"
              >
                TRUTH (EXPOSE)
              </button>
              <button
                type="button"
                onClick={() => pick("dare")}
                className="min-h-12 border-2 border-copper bg-copper font-mono text-xs font-black text-ink hover:bg-amber transition"
              >
                DARE (VIOLENCE)
              </button>
            </div>
          </div>
        ) : (
          <div className="border border-line bg-ink p-3 text-center text-xs font-bold text-cream/60">
            Waiting for partner to pick Truth or Dare...
          </div>
        )
      ) : (
        <div className="space-y-3">
          <div className="border-2 border-copper bg-[#18001d] p-3 text-center">
            <span className="font-mono text-[10px] font-black uppercase text-amber">
              [{state.choice}]
            </span>
            <p className="mt-1 text-sm font-black text-cream leading-5">
              &ldquo;{state.prompt}&rdquo;
            </p>
          </div>
          {isYourTurn ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleComplete}
                className="min-h-10 border-2 border-amber bg-amber text-xs font-black text-ink hover:opacity-90"
              >
                SURVIVED (+500 AURA)
              </button>
              <button
                type="button"
                onClick={handleForfeit}
                className="min-h-10 border-2 border-line bg-ink text-xs font-black text-copper hover:border-copper"
              >
                CHICKENED OUT (-500)
              </button>
            </div>
          ) : (
            <p className="text-center text-xs font-bold text-cream/60">
              Partner is currently attempting or chickening out of this dare...
            </p>
          )}
        </div>
      )}
    </div>
  );
}

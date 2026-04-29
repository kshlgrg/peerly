import { Dice5, Gamepad2 } from "lucide-react";

const games = [
  ["tic_tac_toe", "Tic Tac Toe", "Fast ego damage."],
  ["connect_four", "Connect Four", "Gravity but petty."],
  ["dice_race", "Dice Race", "Ludo-ish sprint. Server rolls."],
  ["loot_tiles", "Loot Tiles", "Pick mystery tiles, steal points."],
];

export default function MiniGames({ compact = false, disabled = false, gameState, gameError, onGame }) {
  const isYourTurn = gameState?.status === "playing" && gameState?.turn === gameState?.you;

  function start(game) {
    onGame?.({ action: "start", game });
  }

  function move(moveData = {}) {
    onGame?.({ action: "move", move: moveData });
  }

  return (
    <section className={`terminal-panel bg-[#100014] p-3 font-mono uppercase ${compact ? "space-y-3" : "space-y-4"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-black text-amber">
          <Gamepad2 size={15} aria-hidden="true" />
          matched room games
        </p>
        <span className="text-xs font-black text-copper">turns server-checked</span>
      </div>

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

      {gameError && <p className="border-2 border-copper bg-ink p-2 text-xs font-black text-copper">{gameError}</p>}

      {!gameState ? (
        <p className="border-2 border-line bg-ink p-3 text-xs font-bold leading-5 text-cream/55">
          Start a game after matching. Refreshing or skipping forfeits the room state, because loopholes are for cowards.
        </p>
      ) : (
        <div className="border-2 border-line bg-ink p-3">
          <GameHeader gameState={gameState} isYourTurn={isYourTurn} />
          {gameState.type === "tic_tac_toe" && <TicTacToe state={gameState} move={move} isYourTurn={isYourTurn} />}
          {gameState.type === "connect_four" && <ConnectFour state={gameState} move={move} isYourTurn={isYourTurn} />}
          {gameState.type === "dice_race" && <DiceRace state={gameState} move={move} isYourTurn={isYourTurn} />}
          {gameState.type === "loot_tiles" && <LootTiles state={gameState} move={move} isYourTurn={isYourTurn} />}
        </div>
      )}
    </section>
  );
}

function GameHeader({ gameState, isYourTurn }) {
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
          {labelForGame(gameState.type)} | you are {gameState.you}
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
  const a = state.positions?.A ?? 0;
  const b = state.positions?.B ?? 0;
  const target = state.target ?? 24;

  return (
    <div className="space-y-3">
      <RaceBar label="A" value={a} target={target} mine={state.you === "A"} />
      <RaceBar label="B" value={b} target={target} mine={state.you === "B"} />
      {state.lastRoll && (
        <p className="text-xs font-black text-cream/60">
          Last roll: {state.lastRoll.player} rolled {state.lastRoll.value}
        </p>
      )}
      <button className="command-button min-h-10 w-full text-xs" type="button" disabled={!isYourTurn} onClick={() => move()}>
        <Dice5 size={14} aria-hidden="true" />
        roll server dice
      </button>
    </div>
  );
}

function LootTiles({ state, move, isYourTurn }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs font-black text-cream/70">
        <span>A score: {state.scores?.A ?? 0}</span>
        <span>B score: {state.scores?.B ?? 0}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
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
        <div className={label === "A" ? "h-full bg-amber" : "h-full bg-copper"} style={{ width: `${(value / target) * 100}%` }} />
      </div>
    </div>
  );
}

function cellClass(mark) {
  if (mark === "A") return "border-amber bg-amber text-ink";
  if (mark === "B") return "border-copper bg-copper text-ink";
  return "border-line bg-[#120015] text-amber";
}

function labelForGame(type) {
  return games.find(([id]) => id === type)?.[1] ?? "Game";
}

import ChatBox from "../components/ChatBox.jsx";
import Controls from "../components/Controls.jsx";
import MatchStatus from "../components/MatchStatus.jsx";
import { useSocket } from "../hooks/useSocket.js";

export default function Chat() {
  const { status, messages, error, gameState, gameError, sendChat, sendGame, next } = useSocket({ mode: "text" });
  const isMatched = status === "matched";

  return (
    <main className="peerly-shell flex min-h-[100dvh] w-full flex-col gap-3 p-3 sm:gap-4 sm:p-4 lg:h-[100dvh] lg:overflow-hidden">
      <header className="relative z-10 mx-auto flex w-full max-w-6xl shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MatchStatus status={status} error={error} />
        <Controls onNext={next} disabled={status === "connecting" || status === "disconnected"} />
      </header>
      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-6xl flex-1 lg:h-full">
        <ChatBox
          messages={messages}
          onSend={sendChat}
          disabled={!isMatched}
          gameState={gameState}
          gameError={gameError}
          onGame={sendGame}
        />
      </div>
    </main>
  );
}

import ChatBox from "../components/ChatBox.jsx";
import Controls from "../components/Controls.jsx";
import MatchStatus from "../components/MatchStatus.jsx";
import { useSocket } from "../hooks/useSocket.js";

export default function Chat() {
  const { status, messages, error, sendChat, next, report } = useSocket({ mode: "text" });
  const isMatched = status === "matched";

  return (
    <main className="mx-auto flex h-screen w-full max-w-6xl flex-col gap-4 p-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MatchStatus status={status} error={error} />
        <Controls
          onNext={next}
          onReport={report}
          disabled={status === "connecting" || status === "disconnected"}
          reportDisabled={!isMatched}
        />
      </header>
      <ChatBox messages={messages} onSend={sendChat} disabled={!isMatched} />
    </main>
  );
}

import { Check, Video, X } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import ChatBox from "../components/ChatBox.jsx";
import Controls from "../components/Controls.jsx";
import MatchStatus from "../components/MatchStatus.jsx";
import { useSocket } from "../hooks/useSocket.js";

export default function Chat() {
  const navigate = useNavigate();
  // Chat mode joins the text queue and receives all room events through one socket hook.
  const {
    status,
    mode,
    messages,
    error,
    gameState,
    gameError,
    videoRequest,
    sendChat,
    sendGame,
    upgradeToVideo,
    respondToVideoRequest,
    next,
  } = useSocket({
    mode: "text",
  });
  // A match is required before chat, games, or video upgrades are useful.
  const isMatched = status === "matched";
  // Only one video upgrade request can be pending at a time.
  const hasVideoRequest = Boolean(videoRequest);

  // When the backend accepts a video upgrade, the same shared session moves to /video.
  // Messages stay in Zustand, so the user does not lose the chat history.
  useEffect(() => {
    if (mode === "video") {
      navigate("/video");
    }
  }, [mode, navigate]);

  return (
    <main className="peerly-shell flex min-h-[100dvh] w-full flex-col gap-3 p-3 sm:gap-4 sm:p-4 lg:h-[100dvh] lg:overflow-hidden">
      <header className="relative z-10 mx-auto flex w-full max-w-6xl shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MatchStatus status={status} error={error} />
        <Controls onNext={next} disabled={status === "connecting" || status === "disconnected"}>
          {/* This sends a consent-based video request instead of forcing both users into camera mode. */}
          <button
            className="command-button border-copper bg-copper text-ink hover:bg-amber"
            type="button"
            onClick={upgradeToVideo}
            disabled={!isMatched || hasVideoRequest}
            title="Send a video request without losing this chat"
          >
            <Video size={17} aria-hidden="true" />
            {hasVideoRequest ? "Video request pending" : "Request video chaos"}
          </button>
        </Controls>
      </header>
      {/* Request banner shows either incoming accept/decline controls or outgoing waiting state. */}
      {videoRequest && (
        <section className="relative z-10 mx-auto w-full max-w-6xl border-2 border-copper bg-[#100014] p-3 font-mono uppercase shadow-[7px_7px_0_rgba(255,79,216,0.7)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-black text-amber">
                <Video size={16} aria-hidden="true" />
                {videoRequest.direction === "incoming" ? "video request incoming" : "video request sent"}
              </p>
              <p className="mt-1 text-xs font-bold leading-5 text-cream/60">
                {videoRequest.direction === "incoming"
                  ? "They want face-card mode. Accept only if the chat has earned eyeballs."
                  : "Waiting for consent. The camera stays in its lane until they accept."}
              </p>
            </div>
            {videoRequest.direction === "incoming" ? (
              // Incoming requests require the current user to explicitly accept or decline.
              <div className="flex flex-wrap gap-2">
                <button
                  className="command-button min-h-10 border-amber bg-amber px-3 text-xs text-ink hover:bg-copper"
                  type="button"
                  onClick={() => respondToVideoRequest(true)}
                >
                  <Check size={15} aria-hidden="true" />
                  accept chaos
                </button>
                <button
                  className="command-button min-h-10 border-line bg-ink px-3 text-xs text-cream hover:border-copper hover:text-copper"
                  type="button"
                  onClick={() => respondToVideoRequest(false)}
                >
                  <X size={15} aria-hidden="true" />
                  decline politely-ish
                </button>
              </div>
            ) : (
              // Outgoing requests stay pending until the partner responds.
              <span className="w-fit border-2 border-amber bg-amber px-3 py-2 text-xs font-black text-ink">
                awaiting verdict
              </span>
            )}
          </div>
        </section>
      )}
      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-6xl flex-1 lg:h-full">
        <ChatBox
          // ChatBox owns the message composer, message list, and embedded games panel.
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

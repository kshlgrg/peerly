import { Camera, Gamepad2, Mic, MonitorUp, SendHorizonal, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import MiniGames from "./MiniGames.jsx";

export const filters = [
  { id: "clean", label: "Clean", className: "video-filter-clean" },
  { id: "crt", label: "CRT", className: "video-filter-crt" },
  { id: "vapor", label: "Vapor", className: "video-filter-vapor" },
  { id: "toxic", label: "Toxic", className: "video-filter-toxic" },
  { id: "alien", label: "Alien", className: "video-filter-alien" },
];

export default function VideoBox({
  localVideoRef,
  remoteVideoRef,
  status,
  localReady,
  mediaError,
  messages,
  onSend,
  gameState,
  gameError,
  onGame,
  onAlienVoiceChange,
  alienVoiceEnabled,
}) {
  const [activeFilter, setActiveFilter] = useState(filters[1]);
  const [gamesOpen, setGamesOpen] = useState(false);
  const mobileLocalVideoRef = useRef(null);

  function chooseFilter(filter) {
    setActiveFilter(filter);
    onAlienVoiceChange?.(filter.id === "alien");
  }

  useEffect(() => {
    if (mobileLocalVideoRef.current && localVideoRef.current?.srcObject) {
      mobileLocalVideoRef.current.srcObject = localVideoRef.current.srcObject;
    }
  }, [localReady, localVideoRef, activeFilter]);

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setGamesOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <section className="grid min-h-0 w-full flex-1 gap-3 sm:gap-4 lg:h-full lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)]">
      <div className="terminal-panel screen-panel relative h-[58dvh] min-h-[430px] overflow-hidden sm:h-[62dvh] lg:h-full lg:min-h-0">
        <video
          ref={remoteVideoRef}
          className={`h-full w-full object-cover ${activeFilter.className}`}
          autoPlay
          playsInline
        />
        {status !== "matched" && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/90 p-6 text-center font-mono text-sm font-black uppercase text-amber">
            Waiting for another brave soul to risk eye contact.
          </div>
        )}
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-md border-2 border-line bg-amber px-3 py-2 font-mono text-xs font-black uppercase text-ink">
          <MonitorUp size={15} aria-hidden="true" />
          stranger danger, campus edition
        </div>
        <div className="terminal-panel absolute bottom-4 left-4 z-10 flex max-w-[calc(100%-9rem)] flex-wrap gap-2 bg-ink/90 p-2 backdrop-blur sm:max-w-[calc(100%-11rem)] lg:max-w-[calc(100%-2rem)]">
          {filters.map((filter) => (
            <button
              key={filter.id}
              className={`min-h-9 border-2 px-3 font-mono text-[10px] font-black uppercase transition ${
                activeFilter.id === filter.id
                  ? "border-copper bg-copper text-ink"
                  : "border-line bg-[#120015] text-cream/70 hover:border-amber hover:text-amber"
              }`}
              type="button"
              onClick={() => chooseFilter(filter)}
              aria-pressed={activeFilter.id === filter.id}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="terminal-panel screen-panel absolute bottom-4 right-4 z-10 h-28 w-28 overflow-hidden bg-ink shadow-[6px_6px_0_rgba(255,79,216,0.65)] sm:h-32 sm:w-32 lg:hidden">
          <video
            ref={mobileLocalVideoRef}
            className={`h-full w-full object-cover ${activeFilter.className}`}
            autoPlay
            muted
            playsInline
          />
          {!localReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/90 p-2 text-center font-mono text-[10px] font-black uppercase text-amber">
              you, unfortunately loading
            </div>
          )}
          <div className="absolute bottom-1 left-1 border-2 border-line bg-copper px-1.5 py-1 font-mono text-[9px] font-black uppercase text-ink">
            you, unfortunately
          </div>
        </div>
      </div>

      <aside className="flex min-h-0 flex-col gap-3 sm:gap-4 lg:h-full lg:overflow-y-auto lg:pr-2">
        <div className="terminal-panel screen-panel relative hidden overflow-hidden lg:block lg:h-[22vh] lg:min-h-[180px] lg:max-h-[240px]">
          <video
            ref={localVideoRef}
            className={`h-full w-full object-cover ${activeFilter.className}`}
            autoPlay
            muted
            playsInline
          />
          {!localReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/90 p-4 text-center font-mono text-xs font-black uppercase text-amber">
              Camera loading. Face card stuck in customs.
            </div>
          )}
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md border-2 border-line bg-copper px-2 py-1.5 font-mono text-xs font-black uppercase text-ink">
            <Camera size={14} aria-hidden="true" />
            You, unfortunately
          </div>
        </div>

        <div className="terminal-panel space-y-3 p-4 font-mono text-sm font-bold uppercase">
          <div className="flex items-center gap-3 text-cream/75">
            {alienVoiceEnabled ? (
              <Sparkles size={16} className="text-copper" aria-hidden="true" />
            ) : (
              <Mic size={16} className="text-copper" aria-hidden="true" />
            )}
            {alienVoiceEnabled
              ? "Alien mic is live. Your voice just filed a noise complaint against itself."
              : "Peer-to-peer video. Server is not collecting your facial lore."}
          </div>
          {mediaError && <p className="text-amber">{mediaError}</p>}
        </div>

        <button
          className="terminal-panel group relative min-h-16 overflow-hidden border-copper bg-amber p-4 text-left font-mono uppercase text-ink shadow-[8px_8px_0_rgba(255,79,216,0.75)] transition hover:-translate-y-1 hover:shadow-[10px_10px_0_rgba(255,79,216,0.95)]"
          type="button"
          onClick={() => setGamesOpen(true)}
          aria-expanded={gamesOpen}
        >
          <span className="flex items-center gap-2 text-sm font-black">
            <Gamepad2 size={18} aria-hidden="true" />
            open chaos arcade
          </span>
          <span className="mt-1 block text-[11px] font-black leading-4 opacity-75">
            {gameState ? "A game is already judging both of you." : "Hidden until needed, because video needs elbow room."}
          </span>
          <span className="absolute right-3 top-3 rounded-sm border-2 border-ink bg-copper px-2 py-1 text-[10px] font-black">
            hot
          </span>
        </button>

        <MiniVideoChat messages={messages} onSend={onSend} disabled={status !== "matched"} />
      </aside>

      {gamesOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/80 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
          <div
            className="terminal-panel screen-panel max-h-[88dvh] w-full max-w-3xl overflow-y-auto bg-[#100014] p-3 shadow-[12px_12px_0_rgba(217,255,0,0.7)] sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Chaos arcade"
          >
            <div className="mb-3 flex items-center justify-between gap-3 border-b-2 border-line pb-3 font-mono uppercase">
              <div>
                <p className="flex items-center gap-2 text-sm font-black text-amber">
                  <Gamepad2 size={17} aria-hidden="true" />
                  chaos arcade
                </p>
                <p className="mt-1 text-[10px] font-black text-cream/45">
                  tiny games for when conversation has no cardio
                </p>
              </div>
              <button
                className="icon-button h-10 w-10"
                type="button"
                onClick={() => setGamesOpen(false)}
                title="Close games"
                aria-label="Close games"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <MiniGames compact disabled={status !== "matched"} gameState={gameState} gameError={gameError} onGame={onGame} />
          </div>
        </div>
      )}
    </section>
  );
}

function MiniVideoChat({ messages, onSend, disabled }) {
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function submit(event) {
    event.preventDefault();
    onSend(draft);
    setDraft("");
  }

  return (
    <section className="terminal-panel flex min-h-44 flex-1 flex-col overflow-hidden lg:min-h-40">
      <div className="border-b-2 border-line bg-amber px-3 py-2 font-mono text-xs font-black uppercase text-ink">
        side chat for emotional damage
      </div>
      <div ref={listRef} className="min-h-28 flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="font-mono text-xs font-black uppercase text-cream/45">
            No words yet. The silence has tenure.
          </p>
        ) : (
          messages.slice(-12).map((message) => (
            <p
              key={message.id}
              className={`border px-2 py-1 text-xs ${
                message.role === "me"
                  ? "border-amber bg-amber text-ink"
                  : message.role === "system"
                    ? "border-line bg-ink font-mono font-black uppercase text-amber"
                    : "border-copper bg-ink text-cream"
              }`}
            >
              {message.text}
            </p>
          ))
        )}
      </div>
      <form className="flex gap-2 border-t-2 border-line p-2" onSubmit={submit}>
        <input
          className="min-w-0 flex-1 rounded-md border-2 border-line bg-ink px-2 text-xs text-cream outline-none placeholder:text-cream/35 focus:border-copper"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={disabled ? "match first, yap later" : "say something dangerously charming"}
          disabled={disabled}
        />
        <button className="icon-button h-10 w-10" type="submit" disabled={disabled || !draft.trim()} title="Send">
          <SendHorizonal size={16} aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}

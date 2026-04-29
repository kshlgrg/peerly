import { SendHorizonal, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import MiniGames from "./MiniGames.jsx";

const cheesyLines = [
  "Be honest: are you always this interesting or is PeerLy carrying?",
  "If this convo flops, I am blaming the Wi-Fi and my character development.",
  "You give main quest energy. Prove me right.",
  "Rate your current vibe: cozy menace, academic victim, or suspiciously locked in?",
  "I was going to say something normal, but that felt off-brand.",
];

export default function ChatBox({ messages, onSend, disabled, gameState, gameError, onGame }) {
  const [draft, setDraft] = useState("");
  const [cheesyMode, setCheesyMode] = useState(false);
  const [cheeseIndex, setCheeseIndex] = useState(0);
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

  function rotateCheese() {
    setCheeseIndex((current) => (current + 1 + Math.floor(Math.random() * 2)) % cheesyLines.length);
  }

  function useCheeseLine() {
    setDraft(cheesyLines[cheeseIndex]);
    rotateCheese();
  }

  function sendCheeseLine() {
    onSend(cheesyLines[cheeseIndex]);
    rotateCheese();
  }

  return (
    <section className="terminal-panel screen-panel flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line bg-[#100014] p-3 font-mono uppercase sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-black text-amber">
            <Sparkles size={14} aria-hidden="true" />
            cheese mode
          </p>
          <p className="mt-1 text-xs font-bold leading-5 text-cream/55">
            {cheesyMode ? cheesyLines[cheeseIndex] : "Turn on emergency cringe. Somehow it works."}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:w-auto">
          <button
            className={`min-h-10 border-2 px-3 text-xs font-black transition ${
              cheesyMode ? "border-copper bg-copper text-ink" : "border-line bg-ink text-amber hover:border-copper"
            }`}
            type="button"
            onClick={() => setCheesyMode((current) => !current)}
          >
            {cheesyMode ? "on" : "off"}
          </button>
          <button
            className="min-h-10 border-2 border-line bg-ink px-3 text-xs font-black text-amber transition hover:border-copper"
            type="button"
            onClick={useCheeseLine}
            disabled={!cheesyMode || disabled}
          >
            load
          </button>
          <button
            className="min-h-10 border-2 border-line bg-amber px-3 text-xs font-black text-ink transition hover:bg-copper"
            type="button"
            onClick={sendCheeseLine}
            disabled={!cheesyMode || disabled}
          >
            send
          </button>
        </div>
      </div>
      <div className="border-b border-line p-3">
        <MiniGames disabled={disabled} gameState={gameState} gameError={gameError} onGame={onGame} />
      </div>
      <div ref={listRef} className="min-h-48 flex-1 space-y-3 overflow-y-auto p-4 lg:min-h-0">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center font-mono text-sm font-black uppercase text-amber">
            {cheesyMode ? "Cheese cannon armed. Waiting for a target." : "Queue is loading. Main character arriving soon."}
          </div>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
      </div>

      <form className="flex gap-3 border-t border-line p-3" onSubmit={submit}>
        <input
          className="min-w-0 flex-1 rounded-md border border-line bg-ink px-3 text-sm text-cream outline-none transition placeholder:text-cream/35 focus:border-amber"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={disabled ? "Waiting for a worthy opponent" : cheesyMode ? "Load cheese or type your own chaos." : "Drop the opener. Be less basic."}
          disabled={disabled}
        />
        <button className="icon-button" type="submit" disabled={disabled || !draft.trim()} title="Send">
          <SendHorizonal size={18} aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}

function MessageBubble({ message }) {
  if (message.role === "system") {
    return (
      <p className="mx-auto max-w-fit rounded-md border-2 border-line bg-ink px-3 py-2 text-center font-mono text-xs font-black uppercase text-amber">
        {message.text}
      </p>
    );
  }

  const isMine = message.role === "me";
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] border px-3 py-2 text-sm leading-6 ${
          isMine
            ? "border-amber bg-amber text-ink"
            : "border-copper bg-ink text-cream shadow-[5px_5px_0_rgba(255,79,216,0.65)]"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}

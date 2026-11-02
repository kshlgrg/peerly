import { Flame, SendHorizonal, Smile, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import MiniGames from "./MiniGames.jsx";
import { playStickerPop } from "../utils/sfx.js";

// Savage sticker pack for instantaneous brainrot reactions
const memeStickers = [
  { emoji: "💀", label: "DEAD AF", tag: "STICKER::💀::DEAD AF" },
  { emoji: "👀", label: "SIDE EYE", tag: "STICKER::👀::SIDE EYE" },
  { emoji: "💅", label: "DELULU", tag: "STICKER::💅::DELULU IS THE SOLULU" },
  { emoji: "🗿", label: "SIGMA", tag: "STICKER::🗿::SIGMA STARE" },
  { emoji: "🚩", label: "RED FLAG", tag: "STICKER::🚩::WALKING RED FLAG" },
  { emoji: "🧢", label: "CAP", tag: "STICKER::🧢::CAP DETECTED" },
  { emoji: "🍳", label: "COOKED", tag: "STICKER::🍳::BRO IS COOKED" },
  { emoji: "✨", label: "RIZZ", tag: "STICKER::✨::UNSPOKEN RIZZ" },
  { emoji: "🤡", label: "CLOWN", tag: "STICKER::🤡::CERTIFIED CLOWN" },
  { emoji: "📉", label: "-100K AURA", tag: "STICKER::📉::-100,000 AURA" },
  { emoji: "📈", label: "+1M AURA", tag: "STICKER::📈::+1,000,000 AURA" },
  { emoji: "🧃", label: "SIP TEA", tag: "STICKER::🧃::SIP TEA & JUDGE" },
];

// Prewritten opener lines support the "cheese mode" feature.
// They are intentionally silly so quiet rooms get a fast starter.
const cheesyLines = [
  "Be honest: are you always this interesting or is PeerLy carrying?",
  "If this convo flops, I am blaming the Wi-Fi and my character development.",
  "You give main quest energy. Prove me right.",
  "Rate your current vibe: cozy menace, academic victim, or suspiciously locked in?",
  "I was going to say something normal, but that felt off-brand.",
];

export default function ChatBox({ messages, onSend, disabled, gameState, gameError, onGame }) {
  // draft is whatever the user has typed into the composer.
  const [draft, setDraft] = useState("");
  // cheesyMode reveals the assisted savage opener workflow.
  const [cheesyMode, setCheesyMode] = useState(false);
  // stickersOpen toggles the meme reaction drawer.
  const [stickersOpen, setStickersOpen] = useState(false);
  // cheeseIndex selects the current prewritten line.
  const [cheeseIndex, setCheeseIndex] = useState(0);
  // listRef points at the scrollable message list.
  const listRef = useRef(null);

  // Keep the newest message visible without forcing the user to scroll manually.
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Normal send flow: stop browser form reload, send the text, clear the input.
  function submit(event) {
    event.preventDefault();
    if (!draft.trim()) return;
    onSend(draft);
    setDraft("");
  }

  function sendSticker(tag) {
    playStickerPop();
    onSend(tag);
    setStickersOpen(false);
  }

  // Move by one or two lines so repeated clicks feel less predictable.
  function rotateCheese() {
    setCheeseIndex((current) => (current + 1 + Math.floor(Math.random() * 2)) % cheesyLines.length);
  }

  // Put a cheesy line into the input so the user can edit it before sending.
  function useCheeseLine() {
    setDraft(cheesyLines[cheeseIndex]);
    rotateCheese();
  }

  // Send the current cheesy line immediately, then prepare the next one.
  function sendCheeseLine() {
    onSend(cheesyLines[cheeseIndex]);
    rotateCheese();
  }

  return (
    <section className="terminal-panel screen-panel flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Cheese-mode toolbar is the assisted opener area above the chat and games. */}
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
        <div className="flex flex-wrap items-center gap-2 sm:w-auto">
          {/* Toggle the suggested-line controls on or off. */}
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

      {/* Meme Sticker Drawer */}
      {stickersOpen && (
        <div className="border-b border-copper bg-[#15001c] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1 font-mono text-[11px] font-black uppercase text-copper">
              <Flame size={13} /> Savage Meme Pack
            </span>
            <button
              type="button"
              onClick={() => setStickersOpen(false)}
              className="font-mono text-[10px] font-bold text-cream/50 hover:text-amber"
            >
              [close]
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {memeStickers.map((stk) => (
              <button
                key={stk.tag}
                type="button"
                onClick={() => sendSticker(stk.tag)}
                disabled={disabled}
                className="flex flex-col items-center justify-center rounded border border-line bg-ink p-2 transition hover:border-amber hover:bg-amber/10 active:scale-95 disabled:opacity-40"
              >
                <span className="text-xl">{stk.emoji}</span>
                <span className="mt-1 font-mono text-[9px] font-black text-cream/70">{stk.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Games sit inside chat so dead air can become a mini challenge. */}
      <div className="border-b border-line p-3">
        <MiniGames disabled={disabled} gameState={gameState} gameError={gameError} onGame={onGame} />
      </div>

      {/* Message timeline renders system, self, and peer messages differently. */}
      <div ref={listRef} className="min-h-48 flex-1 space-y-3 overflow-y-auto p-4 lg:min-h-0">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center font-mono text-sm font-black uppercase text-amber">
            {cheesyMode ? "Cheese cannon armed. Waiting for a target." : "Queue is loading. Main character arriving soon."}
          </div>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
      </div>

      {/* Composer is disabled until a match exists, preventing orphan messages. */}
      <form className="flex gap-2 border-t border-line p-3" onSubmit={submit}>
        <button
          className={`min-h-10 border-2 px-3 text-xs font-black transition ${
            stickersOpen ? "border-copper bg-copper text-ink" : "border-line bg-ink text-amber hover:border-amber"
          }`}
          type="button"
          onClick={() => setStickersOpen((v) => !v)}
          disabled={disabled}
          title="Meme Stickers"
        >
          <Smile size={18} aria-hidden="true" />
        </button>
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

// One bubble renderer keeps the timeline mapping clean.
function MessageBubble({ message }) {
  // System messages are centered announcements like "matched" or "video request sent".
  if (message.role === "system") {
    return (
      <p className="mx-auto max-w-fit rounded-md border-2 border-line bg-ink px-3 py-2 text-center font-mono text-xs font-black uppercase text-amber">
        {message.text}
      </p>
    );
  }

  // Handle meme stickers
  if (message.text && message.text.startsWith("STICKER::")) {
    const parts = message.text.split("::");
    const emoji = parts[1] || "✨";
    const label = parts[2] || "MEME";
    const isMine = message.role === "me";
    return (
      <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
        <div
          className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 ${
            isMine
              ? "border-amber bg-[#1e1400] text-amber shadow-[0_0_12px_rgba(217,255,0,0.3)]"
              : "border-copper bg-[#1c001f] text-copper shadow-[5px_5px_0_rgba(255,79,216,0.5)]"
          }`}
        >
          <span className="text-2xl">{emoji}</span>
          <span className="font-mono text-xs font-black tracking-wide">{label}</span>
        </div>
      </div>
    );
  }

  // User messages align right; peer messages align left with the copper shadow.
  const isMine = message.role === "me";
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] border px-3 py-2 text-sm leading-6 ${
          isMine
            ? "border-amber bg-amber text-ink font-mono font-medium"
            : "border-copper bg-ink text-cream font-mono shadow-[5px_5px_0_rgba(255,79,216,0.65)]"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}

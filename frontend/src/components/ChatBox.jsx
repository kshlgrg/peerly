import { SendHorizonal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function ChatBox({ messages, onSend, disabled }) {
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
    <section className="terminal-panel screen-panel flex min-h-0 flex-1 flex-col">
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center font-mono text-sm text-cream/45">
            Waiting by the warm screen...
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
          placeholder={disabled ? "Waiting for a match" : "Type a message"}
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
      <p className="mx-auto max-w-fit rounded-md border border-line bg-ink px-3 py-2 text-center font-mono text-xs text-cream/60">
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
            ? "border-amber/70 bg-amber/10 text-cream"
            : "border-line bg-ink text-cream"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}

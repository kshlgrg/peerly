import { Camera, Mic, MonitorUp, SendHorizonal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  activeFilter,
  alienVoiceEnabled,
}) {
  const mobileLocalVideoRef = useRef(null);

  useEffect(() => {
    if (mobileLocalVideoRef.current && localVideoRef.current?.srcObject) {
      mobileLocalVideoRef.current.srcObject = localVideoRef.current.srcObject;
    }
  }, [localReady, localVideoRef, activeFilter]);

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
            Waiting for the other legend to spawn.
          </div>
        )}
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-md border-2 border-line bg-amber px-3 py-2 font-mono text-xs font-black uppercase text-ink">
          <MonitorUp size={15} aria-hidden="true" />
          Stranger danger, but make it campus
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
              see myself loading
            </div>
          )}
          <div className="absolute bottom-1 left-1 border-2 border-line bg-copper px-1.5 py-1 font-mono text-[9px] font-black uppercase text-ink">
            you
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
              Camera loading. Face card pending.
            </div>
          )}
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md border-2 border-line bg-copper px-2 py-1.5 font-mono text-xs font-black uppercase text-ink">
            <Camera size={14} aria-hidden="true" />
            See myself
          </div>
        </div>

        <div className="terminal-panel space-y-3 p-4 font-mono text-sm font-bold uppercase">
          <div className="flex items-center gap-3 text-cream/75">
            <Mic size={16} className="text-copper" aria-hidden="true" />
            {alienVoiceEnabled
              ? "Alien mic is live. You now sound like campus Wi-Fi gained sentience."
              : "Video is peer-to-peer. Server is not your nosy auntie."}
          </div>
          {mediaError && <p className="text-amber">{mediaError}</p>}
        </div>

        <MiniVideoChat messages={messages} onSend={onSend} disabled={status !== "matched"} />
      </aside>
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
        side chat for awkward silences
      </div>
      <div ref={listRef} className="min-h-28 flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="font-mono text-xs font-black uppercase text-cream/45">
            No words yet. Historic levels of silence.
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
          placeholder={disabled ? "match first" : "tiny roast, tiny compliment"}
          disabled={disabled}
        />
        <button className="icon-button h-10 w-10" type="submit" disabled={disabled || !draft.trim()} title="Send">
          <SendHorizonal size={16} aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}

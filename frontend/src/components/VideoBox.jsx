import { Camera, Mic, MonitorUp } from "lucide-react";

export default function VideoBox({
  localVideoRef,
  remoteVideoRef,
  status,
  localReady,
  mediaError,
}) {
  return (
    <section className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="terminal-panel screen-panel relative min-h-[420px] overflow-hidden">
        <video ref={remoteVideoRef} className="h-full w-full object-cover" autoPlay playsInline />
        {status !== "matched" && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/90 p-6 text-center font-mono text-sm font-black uppercase text-amber">
            Waiting for the other legend to spawn.
          </div>
        )}
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-md border-2 border-line bg-amber px-3 py-2 font-mono text-xs font-black uppercase text-ink">
          <MonitorUp size={15} aria-hidden="true" />
          Stranger danger, but make it campus
        </div>
      </div>

      <aside className="flex min-h-0 flex-col gap-4">
        <div className="terminal-panel screen-panel relative aspect-video overflow-hidden">
          <video
            ref={localVideoRef}
            className="h-full w-full object-cover"
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
            You, unfortunately
          </div>
        </div>

        <div className="terminal-panel space-y-3 p-4 font-mono text-sm font-bold uppercase">
          <div className="flex items-center gap-3 text-cream/75">
            <Mic size={16} className="text-copper" aria-hidden="true" />
            Video is peer-to-peer. Server is not your nosy auntie.
          </div>
          {mediaError && <p className="text-amber">{mediaError}</p>}
        </div>
      </aside>
    </section>
  );
}

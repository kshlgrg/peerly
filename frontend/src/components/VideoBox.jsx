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
          <div className="absolute inset-0 flex items-center justify-center bg-ink/85 p-6 text-center font-mono text-sm text-cream/60">
            Remote feed will appear after matching.
          </div>
        )}
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-md border border-line bg-ink/90 px-3 py-2 font-mono text-xs text-cream/75">
          <MonitorUp size={15} aria-hidden="true" />
          Peer
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
            <div className="absolute inset-0 flex items-center justify-center bg-ink/85 p-4 text-center font-mono text-xs text-cream/60">
              Camera starting...
            </div>
          )}
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md border border-line bg-ink/90 px-2 py-1.5 font-mono text-xs text-cream/75">
            <Camera size={14} aria-hidden="true" />
            You
          </div>
        </div>

        <div className="terminal-panel space-y-3 p-4 font-mono text-sm">
          <div className="flex items-center gap-3 text-cream/75">
            <Mic size={16} className="text-amber" aria-hidden="true" />
            Audio and video are peer-to-peer.
          </div>
          {mediaError && <p className="text-amber">{mediaError}</p>}
        </div>
      </aside>
    </section>
  );
}

import { MessageSquareText, Power, Video } from "lucide-react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-8">
      <section className="w-full max-w-4xl">
        <div className="terminal-panel border-[10px] border-[#3a2a1e] bg-[#312316] p-3 shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
          <div className="screen-panel rounded-md border border-line bg-ink px-5 py-7 sm:px-8 sm:py-10">
            <div className="mb-9 font-mono">
              <p className="mb-3 flex items-center gap-2 text-sm text-amber">
                <Power size={15} aria-hidden="true" />
                peerly://campus-room
              </p>
              <h1 className="text-5xl font-black tracking-normal text-cream sm:text-6xl">
                PeerLy
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-cream/70">
                Anonymous student chat with instant matching, soft CRT glow, and peer-to-peer video.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ModeLink
                to="/chat"
                icon={MessageSquareText}
                title="Start Text Chat"
                copy="Queue, match, talk, skip."
              />
              <ModeLink
                to="/video"
                icon={Video}
                title="Start Video Chat"
                copy="WebRTC media, socket signaling."
              />
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-line pt-4 font-mono text-xs text-cream/45">
              <span>READY</span>
              <span>STUN: ONLINE</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ModeLink({ to, icon: Icon, title, copy }) {
  return (
    <Link
      to={to}
      className="terminal-panel group flex min-h-44 flex-col justify-between bg-[#1d140f] p-5 transition hover:border-amber"
    >
      <Icon className="text-amber transition group-hover:text-mint" size={28} aria-hidden="true" />
      <div>
        <h2 className="text-xl font-bold text-cream">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-cream/60">{copy}</p>
      </div>
    </Link>
  );
}

import { MessageSquareText, Power, Sparkles, Video } from "lucide-react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden px-5 py-8">
      <section className="w-full max-w-5xl">
        <div className="ticker mb-5 overflow-hidden">
          <div className="flex min-w-max gap-8 px-3">
            <span>random campus chaos</span>
            <span>no profiles</span>
            <span>no algorithm babysitter</span>
            <span>vibe check starts now</span>
          </div>
        </div>

        <div className="terminal-panel border-[12px] border-ink bg-violet p-3">
          <div className="screen-panel rounded-md border-2 border-line bg-ink px-5 py-7 sm:px-8 sm:py-10">
            <div className="mb-9 font-mono">
              <p className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-amber">
                <Power size={15} aria-hidden="true" />
                peerly://enter-the-peer-zone
              </p>
              <h1 className="sticker-title text-6xl font-black uppercase tracking-normal sm:text-8xl">
                PeerLy
              </h1>
              <p className="mt-5 max-w-2xl text-lg font-black uppercase leading-7 text-amber sm:text-xl">
                Meet a random student. Survive the convo. Skip the NPC energy.
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-cream/70">
                Anonymous text and video matching for campus people who are done pretending group chats are social life.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ModeLink
                to="/chat"
                icon={MessageSquareText}
                title="Text Chaos"
                copy="Type something elite or get skipped into history."
              />
              <ModeLink
                to="/video"
                icon={Video}
                title="Face Card Mode"
                copy="Camera on. Confidence optional. Lag excuses rejected."
              />
            </div>

            <div className="mt-6 grid gap-3 border-t-2 border-line pt-4 font-mono text-xs font-black uppercase text-cream/70 sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-copper" aria-hidden="true" />
                no bios, no cringe resumes
              </div>
              <span>status: violently online</span>
              <span>stun: cooking</span>
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
      className="terminal-panel group flex min-h-48 flex-col justify-between bg-panel p-5 transition hover:-translate-y-1 hover:border-copper hover:bg-[#130513]"
    >
      <Icon className="text-amber transition group-hover:text-copper" size={32} aria-hidden="true" />
      <div>
        <h2 className="text-2xl font-black uppercase text-cream">{title}</h2>
        <p className="mt-2 text-sm font-bold leading-6 text-cream/65">{copy}</p>
      </div>
    </Link>
  );
}

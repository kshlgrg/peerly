import { Dice5, MessageSquareText, Sparkles, Video, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { disconnectSocketSession } from "../hooks/useSocket.js";

const featureRows = [
  ["Random matching", "Queue up, get paired, skip when the vibe is expired."],
  ["Text + video", "Chat normally or go camera-on with retro filters."],
  ["Mini games inside rooms", "The fun lives where people wait, not all over the front door."],
];

const genzFacts = [
  ["aura debt", "When you open with 'hey' and expect a personality to spawn."],
  ["NPC audit", "PeerLy's skip button exists because some conversations are legally furniture."],
  ["lore unlocked", "The backend matches people. The browser handles the video. Clean little two-step."],
  ["yap velocity", "If both people type within 10 seconds, the conversation is officially not cooked."],
];

export default function Home() {
  const [factIndex, setFactIndex] = useState(0);
  const fact = genzFacts[factIndex];

  useEffect(() => {
    disconnectSocketSession();
  }, []);

  return (
    <main className="peerly-shell flex min-h-[100dvh] items-center justify-center overflow-x-hidden px-3 py-6 sm:px-5 lg:py-8">
      <section className="relative z-10 w-full max-w-6xl">
        <div className="ticker mb-5 overflow-hidden">
          <div className="flex min-w-max gap-8 px-3">
            <span>zero profiles</span>
            <span>zero bios</span>
            <span>zero algorithm babysitter</span>
            <span>peerly online</span>
            <span>skip button armed</span>
          </div>
        </div>

        <div className="terminal-panel border-[8px] border-ink bg-violet p-2 sm:border-[12px] sm:p-3">
          <div className="screen-panel rounded-md border-2 border-line bg-ink px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
            <div className="mx-auto max-w-5xl font-mono">
              <p className="mb-4 flex items-center gap-2 text-sm font-black uppercase text-amber">
                <Zap size={16} aria-hidden="true" />
                peerly://student-random-chat
              </p>

              <h1 className="sticker-title text-[3.8rem] font-black uppercase leading-none tracking-normal sm:text-8xl lg:text-[9.5rem]">
                PeerLy
              </h1>

              <div className="mt-6">
                <p className="max-w-4xl text-lg font-black uppercase leading-8 text-amber sm:text-2xl">
                  Anonymous student chat without profiles, bios, or LinkedIn cosplay.
                </p>
                <p className="mt-4 max-w-4xl text-sm leading-6 text-cream/70 sm:text-base">
                  Pick text or video, get matched with a random peer, play tiny room games when the room gets too quiet,
                  and hit skip when the conversation starts paying rent in awkwardness.
                </p>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <ModeLink
                  to="/chat"
                  icon={MessageSquareText}
                  title="Start Text Chat"
                  copy="Low pressure. High chance of unhinged campus lore."
                />
                <ModeLink
                  to="/video"
                  icon={Video}
                  title="Start Video Chat"
                  copy="Face card mode with filters, side chat, and tiny games."
                />
              </div>

              <div className="mt-8 grid gap-3 border-t-2 border-line pt-5 lg:grid-cols-3">
                {featureRows.map(([title, copy]) => (
                  <div key={title} className="border-2 border-line bg-[#090012] p-4">
                    <p className="flex items-center gap-2 text-xs font-black uppercase text-amber">
                      <Sparkles size={14} aria-hidden="true" />
                      {title}
                    </p>
                    <p className="mt-2 text-xs font-bold leading-5 text-cream/60">{copy}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-2 border-line bg-[#100014] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase text-copper">random gen z platform fact</p>
                    <p className="mt-2 text-lg font-black uppercase text-amber">{fact[0]}</p>
                    <p className="mt-1 text-xs font-bold leading-5 text-cream/60">{fact[1]}</p>
                  </div>
                  <button
                    className="command-button min-h-10 px-3 text-xs"
                    type="button"
                    onClick={() => setFactIndex((current) => (current + 1) % genzFacts.length)}
                  >
                    <Dice5 size={14} aria-hidden="true" />
                    roll
                  </button>
                </div>
              </div>

              <div className="mt-4 border-2 border-copper bg-ink p-4">
                <p className="text-xs font-black uppercase text-copper">privacy reality check</p>
                <p className="mt-2 text-sm font-black uppercase leading-6 text-amber">
                  Test build: chat messages and basic platform activity may be reviewed for safety and debugging. Do
                  not type nuclear secrets, confession lore, or anything your future self would sue you for.
                </p>
              </div>
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
      className="terminal-panel group flex min-h-52 flex-col justify-between bg-panel p-5 transition hover:-translate-y-1 hover:border-copper hover:bg-[#130513]"
    >
      <Icon className="text-amber transition group-hover:text-copper" size={34} aria-hidden="true" />
      <div>
        <h2 className="text-2xl font-black uppercase text-cream">{title}</h2>
        <p className="mt-2 text-sm font-bold leading-6 text-cream/65">{copy}</p>
      </div>
    </Link>
  );
}

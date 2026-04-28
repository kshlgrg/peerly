import {
  BadgeCheck,
  Dice5,
  Gamepad2,
  MessageSquareText,
  Power,
  Radar,
  Sparkles,
  Video,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const openers = [
  "Rate today's campus Wi-Fi trauma from 1 to cooked.",
  "What class has main-villain energy and why?",
  "Drop your most unserious study habit.",
  "Best campus food item or are we all suffering?",
  "What is your academic red flag? Be honest-ish.",
  "If your semester had a soundtrack, what song is playing?",
];

const vocab = [
  "locked in",
  "side quest",
  "aura debt",
  "crashout pending",
  "NPC audit",
  "lore unlocked",
  "vibe tax",
  "social battery bankrupt",
];

const bingoTiles = [
  "camera denied",
  "Wi-Fi villain arc",
  "mutual academic pain",
  "accidental therapy",
  "skip speedrun",
  "lore dump",
  "group project trauma",
  "cafeteria slander",
  "finals panic",
];

const roastLines = [
  "Your opener has 4 seconds before the skip button starts glowing.",
  "If you say 'hey' and vanish, the app files a complaint emotionally.",
  "Small talk is allowed, but only if it pays rent.",
  "Confidence loading. Charisma DLC not included.",
  "This queue has seen things. Be interesting for once.",
];

const forecastRows = [
  ["Yap probability", "82%"],
  ["Skip risk", "31%"],
  ["Awkward silence tax", "14%"],
  ["Unexpected bestie chance", "67%"],
];

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden px-4 py-6 sm:px-5 lg:py-8">
      <section className="w-full max-w-7xl">
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
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
              <div>
                <HeroBlock />

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

                <VibeConsole />
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                <SlangSlot />
                <CampusBingo />
                <QueueForecast />
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_1.15fr]">
              <MicroToy title="Tonight's Quest" value="Find one person who isn't allergic to conversation." />
              <MicroToy title="Anti-Cringe Patch" value="No profiles. No follow counts. No LinkedIn cosplay." />
              <RoastTicker />
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

function HeroBlock() {
  return (
    <div className="mb-9 font-mono">
      <p className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-amber">
        <Power size={15} aria-hidden="true" />
        peerly://enter-the-peer-zone
      </p>
      <h1 className="sticker-title text-6xl font-black uppercase tracking-normal sm:text-8xl lg:text-9xl">
        PeerLy
      </h1>
      <p className="mt-5 max-w-2xl text-lg font-black uppercase leading-7 text-amber sm:text-xl">
        Meet a random student. Survive the convo. Skip the NPC energy.
      </p>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-cream/70">
        Anonymous text and video matching for campus people who are done pretending group chats are social life.
      </p>
    </div>
  );
}

function VibeConsole() {
  const [openerIndex, setOpenerIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [heat, setHeat] = useState(42);

  function remix() {
    setOpenerIndex((current) => (current + 1 + Math.floor(Math.random() * 3)) % openers.length);
    setWordIndex((current) => (current + 1 + Math.floor(Math.random() * 4)) % vocab.length);
    setHeat((current) => Math.min(100, Math.max(8, current + Math.floor(Math.random() * 35) - 12)));
  }

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="terminal-panel bg-[#090012] p-4">
        <div className="mb-3 flex items-center gap-2 font-mono text-xs font-black uppercase text-copper">
          <Gamepad2 size={15} aria-hidden="true" />
          micro game: vibe calibration
        </div>
        <div className="h-4 overflow-hidden rounded-sm border-2 border-line bg-ink">
          <div
            className="h-full bg-gradient-to-r from-copper via-amber to-mint transition-all"
            style={{ width: `${heat}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 font-mono text-xs font-black uppercase text-cream/70">
          <span>{heat}% social battery</span>
          <button className="command-button min-h-9 px-3 text-xs" type="button" onClick={remix}>
            <Dice5 size={14} aria-hidden="true" />
            reroll
          </button>
        </div>
      </div>

      <div className="terminal-panel bg-[#100014] p-4 font-mono uppercase">
        <p className="text-xs font-black text-amber">starter pack</p>
        <p className="mt-2 text-sm font-black leading-6 text-cream">{openers[openerIndex]}</p>
        <p className="mt-3 inline-block border-2 border-copper bg-copper px-2 py-1 text-xs font-black text-ink">
          word of the minute: {vocab[wordIndex]}
        </p>
      </div>
    </div>
  );
}

function SlangSlot() {
  const [index, setIndex] = useState(2);

  return (
    <section className="terminal-panel bg-[#130513] p-4 font-mono uppercase">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs font-black text-amber">slang slot machine</p>
        <button
          className="icon-button h-9 w-9"
          type="button"
          onClick={() => setIndex((current) => (current + 1 + Math.floor(Math.random() * 5)) % vocab.length)}
          title="Spin slang"
          aria-label="Spin slang"
        >
          <Dice5 size={15} aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs font-black">
        {[0, 1, 2].map((offset) => (
          <span key={offset} className="border-2 border-line bg-amber px-2 py-3 text-ink">
            {vocab[(index + offset) % vocab.length]}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs font-bold leading-5 text-cream/55">
        Use responsibly. Saying all three in one sentence may reduce aura.
      </p>
    </section>
  );
}

function CampusBingo() {
  const [checked, setChecked] = useState([]);

  function toggle(tile) {
    setChecked((current) =>
      current.includes(tile) ? current.filter((item) => item !== tile) : [...current, tile],
    );
  }

  return (
    <section className="terminal-panel bg-[#090012] p-4 font-mono uppercase">
      <div className="mb-3 flex items-center gap-2 text-xs font-black text-copper">
        <Gamepad2 size={15} aria-hidden="true" />
        campus bingo
      </div>
      <div className="grid grid-cols-3 gap-2">
        {bingoTiles.map((tile) => {
          const active = checked.includes(tile);
          return (
            <button
              key={tile}
              className={`min-h-16 border-2 p-2 text-[10px] font-black uppercase leading-4 transition ${
                active
                  ? "border-copper bg-copper text-ink"
                  : "border-line bg-ink text-cream hover:border-copper"
              }`}
              type="button"
              onClick={() => toggle(tile)}
            >
              {tile}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs font-black text-amber">{checked.length}/9 chaos artifacts collected</p>
    </section>
  );
}

function QueueForecast() {
  return (
    <section className="terminal-panel bg-[#101000] p-4 font-mono uppercase">
      <div className="mb-3 flex items-center gap-2 text-xs font-black text-amber">
        <Radar size={15} aria-hidden="true" />
        queue forecast
      </div>
      <div className="space-y-3">
        {forecastRows.map(([label, value], index) => (
          <div key={label}>
            <div className="mb-1 flex justify-between gap-3 text-xs font-black text-cream/75">
              <span>{label}</span>
              <span>{value}</span>
            </div>
            <div className="h-3 border-2 border-line bg-ink">
              <div
                className={`h-full ${index % 2 === 0 ? "bg-amber" : "bg-copper"}`}
                style={{ width: value }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MicroToy({ title, value }) {
  return (
    <section className="terminal-panel bg-panel p-4 font-mono uppercase">
      <div className="mb-2 flex items-center gap-2 text-xs font-black text-copper">
        <BadgeCheck size={15} aria-hidden="true" />
        {title}
      </div>
      <p className="text-sm font-black leading-6 text-cream">{value}</p>
    </section>
  );
}

function RoastTicker() {
  const [index, setIndex] = useState(0);

  return (
    <section className="terminal-panel bg-[#120015] p-4 font-mono uppercase">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-black text-amber">pre-chat roast bot</p>
        <button
          className="command-button min-h-9 px-3 text-xs"
          type="button"
          onClick={() => setIndex((current) => (current + 1) % roastLines.length)}
        >
          next burn
        </button>
      </div>
      <p className="text-sm font-black leading-6 text-cream">{roastLines[index]}</p>
    </section>
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

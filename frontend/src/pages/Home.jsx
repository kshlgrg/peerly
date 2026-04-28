import {
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

const roastLines = [
  "Your opener has 4 seconds before the skip button starts glowing.",
  "If you say 'hey' and vanish, the app files a complaint emotionally.",
  "Small talk is allowed, but only if it pays rent.",
  "Confidence loading. Charisma DLC not included.",
  "This queue has seen things. Be interesting for once.",
];

const facts = [
  "WebRTC does the video peer-to-peer after the socket handles the intro.",
  "A good opener beats a perfect profile. This is science if you do not ask scientists.",
  "The skip button is basically emotional fast travel.",
  "Anonymous chat works best when the app stays tiny and the people stay interesting.",
  "If two devices join the same mode, the backend plays matchmaker and then gets out of the way.",
];

const deskMoods = [
  ["Cozy chaos", "Lamp on. Hoodie mode. Social battery is pretending to exist."],
  ["Library mode", "Quiet voice, loud thoughts, suspiciously high yap potential."],
  ["Main character", "Camera ready. Notes ignored. Aura temporarily sponsored."],
  ["Deadline soup", "One assignment away from becoming campus folklore."],
];

const memoryLabels = ["AURA", "WIFI", "LORE", "YAP"];

const forecastRows = [
  ["Yap probability", "82%"],
  ["Skip risk", "31%"],
  ["Awkward silence tax", "14%"],
  ["Unexpected bestie chance", "67%"],
];

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden px-3 py-6 sm:px-5 lg:py-8">
      <section className="w-full min-w-0 max-w-[calc(100vw-1.5rem)] sm:max-w-7xl">
        <div className="ticker mb-5 overflow-hidden">
          <div className="flex min-w-max gap-8 px-3">
            <span>random campus chaos</span>
            <span>no profiles</span>
            <span>no algorithm babysitter</span>
            <span>vibe check starts now</span>
          </div>
        </div>

        <div className="terminal-panel min-w-0 border-[8px] border-ink bg-violet p-2 sm:border-[12px] sm:p-3">
          <div className="screen-panel min-w-0 rounded-md border-2 border-line bg-ink px-4 py-7 sm:px-8 sm:py-10">
            <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0">
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

              <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-1">
                <DeskConsole />
                <ReactionTap />
                <MemoryFlip />
                <FactGenerator />
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1.15fr]">
              <SlangSlot />
              <MoodDial />
              <QueueForecast />
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
    <div className="mb-9 font-mono xl:min-h-[390px]">
      <p className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-amber">
        <Power size={15} aria-hidden="true" />
        peerly://enter-the-peer-zone
      </p>
      <h1 className="sticker-title text-[3.35rem] font-black uppercase leading-none tracking-normal sm:text-8xl lg:text-9xl xl:text-[9.5rem]">
        PeerLy
      </h1>
      <p className="mt-5 max-w-3xl break-words text-base font-black uppercase leading-7 text-amber sm:text-xl">
        Random student chats with warm CRT energy and zero LinkedIn cosplay.
      </p>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-cream/70">
        Tap text or video, get matched, survive the opener, skip the NPC energy. No profiles, no fake networking,
        no 12-step onboarding ritual.
      </p>
      <div className="mt-6 grid max-w-3xl gap-3 sm:grid-cols-3">
        {["anonymous", "instant queue", "peer-to-peer video"].map((label) => (
          <span key={label} className="border-2 border-line bg-[#120015] px-3 py-2 text-xs font-black uppercase text-cream/75">
            {label}
          </span>
        ))}
      </div>
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

function DeskConsole() {
  const [scan, setScan] = useState(62);

  return (
    <section className="terminal-panel bg-[#090012] p-4 font-mono uppercase">
      <div className="mb-4 flex items-center justify-between gap-3 text-xs font-black text-copper">
        <span className="flex items-center gap-2">
          <Radar size={15} aria-hidden="true" />
          desk console
        </span>
        <span className="text-amber">warm</span>
      </div>
      <div className="grid grid-cols-[1fr_96px] gap-3">
        <div className="space-y-2">
          {["match radar", "awkward filter", "chaos buffer"].map((label, index) => (
            <div key={label}>
              <div className="mb-1 flex justify-between text-[10px] font-black text-cream/60">
                <span>{label}</span>
                <span>{Math.max(12, (scan + index * 17) % 100)}%</span>
              </div>
              <div className="h-3 border-2 border-line bg-ink">
                <div
                  className={index === 1 ? "h-full bg-copper" : "h-full bg-amber"}
                  style={{ width: `${Math.max(12, (scan + index * 17) % 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <button
          className="border-2 border-copper bg-[#170017] text-xs font-black text-amber transition hover:bg-copper hover:text-ink"
          type="button"
          onClick={() => setScan((current) => (current + 29) % 100)}
        >
          scan room
        </button>
      </div>
      <p className="mt-3 text-xs font-bold leading-5 text-cream/55">
        Tiny status board. Makes waiting feel less like staring into academic debt.
      </p>
    </section>
  );
}

function ReactionTap() {
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState("tap to prove you are not buffering");

  function tap() {
    const next = score + 1;
    setScore(next);
    setCombo(next % 5 === 0 ? "combo hit. dangerously employable reflexes." : "clean tap. aura protected.");
  }

  return (
    <section className="terminal-panel bg-[#120015] p-4 font-mono uppercase">
      <div className="mb-3 flex items-center justify-between gap-3 text-xs font-black text-amber">
        <span className="flex items-center gap-2">
          <Gamepad2 size={15} aria-hidden="true" />
          one-tap reflex
        </span>
        <span>{score}</span>
      </div>
      <button
        className="flex min-h-28 w-full items-center justify-center border-2 border-line bg-amber px-4 text-center text-lg font-black text-ink transition hover:-translate-y-0.5 hover:bg-copper"
        type="button"
        onClick={tap}
      >
        tap before the convo gets dry
      </button>
      <p className="mt-3 min-h-10 text-xs font-bold leading-5 text-cream/60">{combo}</p>
    </section>
  );
}

function MoodDial() {
  const [index, setIndex] = useState(0);
  const mood = deskMoods[index];

  return (
    <section className="terminal-panel bg-[#090012] p-4 font-mono uppercase">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-black text-amber">mood dial</p>
        <button
          className="icon-button h-9 w-9"
          type="button"
          onClick={() => setIndex((current) => (current + 1) % deskMoods.length)}
          title="Change mood"
          aria-label="Change mood"
        >
          <Dice5 size={15} aria-hidden="true" />
        </button>
      </div>
      <p className="text-lg font-black text-copper">{mood[0]}</p>
      <p className="mt-2 min-h-16 text-xs font-bold leading-5 text-cream/60">{mood[1]}</p>
    </section>
  );
}

function MemoryFlip() {
  const [tiles, setTiles] = useState(() => [...memoryLabels, ...memoryLabels].sort(() => 0.5 - Math.random()));
  const [flipped, setFlipped] = useState([]);
  const [solved, setSolved] = useState([]);

  function flip(index) {
    if (flipped.includes(index) || solved.includes(index)) {
      return;
    }

    if (flipped.length === 1) {
      const first = flipped[0];
      if (tiles[first] === tiles[index]) {
        setSolved((current) => [...current, first, index]);
        setFlipped([]);
      } else {
        setFlipped([index]);
      }
      return;
    }

    setFlipped([index]);
  }

  function reset() {
    setTiles([...memoryLabels, ...memoryLabels].sort(() => 0.5 - Math.random()));
    setFlipped([]);
    setSolved([]);
  }

  return (
    <section className="terminal-panel bg-[#101000] p-4 font-mono uppercase">
      <div className="mb-3 flex items-center justify-between gap-3 text-xs font-black text-copper">
        <Gamepad2 size={15} aria-hidden="true" />
        memory flip
        <span className="text-amber">{solved.length / 2}/4</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {tiles.map((tile, index) => {
          const visible = flipped.includes(index) || solved.includes(index);
          return (
            <button
              key={`${tile}-${index}`}
              className={`min-h-14 border-2 text-[10px] font-black transition ${
                visible ? "border-copper bg-copper text-ink" : "border-line bg-ink text-amber"
              }`}
              type="button"
              onClick={() => flip(index)}
            >
              {visible ? tile : "??"}
            </button>
          );
        })}
      </div>
      <button className="mt-3 w-full border-2 border-line bg-ink py-2 text-xs font-black text-cream" type="button" onClick={reset}>
        reshuffle
      </button>
    </section>
  );
}

function FactGenerator() {
  const [index, setIndex] = useState(0);

  return (
    <section className="terminal-panel bg-[#130513] p-4 font-mono uppercase">
      <div className="mb-3 flex items-center gap-2 text-xs font-black text-amber">
        <Sparkles size={15} aria-hidden="true" />
        random fact terminal
      </div>
      <p className="min-h-20 text-sm font-black leading-6 text-cream">{facts[index]}</p>
      <button
        className="command-button mt-3 min-h-9 px-3 text-xs"
        type="button"
        onClick={() => setIndex((current) => (current + 1 + Math.floor(Math.random() * 2)) % facts.length)}
      >
        generate lore
      </button>
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

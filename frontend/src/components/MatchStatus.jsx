import { RadioTower, Search, Unplug, Users } from "lucide-react";

const statusMap = {
  connecting: {
    icon: RadioTower,
    label: "Booting",
    detail: "Socket warming up, relax",
  },
  connected: {
    icon: RadioTower,
    label: "Plugged In",
    detail: "Joining the chaos queue",
  },
  waiting: {
    icon: Search,
    label: "Hunting",
    detail: "Finding someone who passes the vibe check",
  },
  matched: {
    icon: Users,
    label: "Locked In",
    detail: "Do not fumble this",
  },
  disconnected: {
    icon: Unplug,
    label: "Cooked",
    detail: "Retrying before the app gets embarrassed",
  },
};

export default function MatchStatus({ status, error }) {
  const current = statusMap[status] ?? statusMap.connecting;
  const Icon = current.icon;

  return (
    <div className="terminal-panel flex items-center justify-between gap-4 px-4 py-3 font-mono text-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center border-2 border-line bg-copper text-ink">
          <Icon size={18} aria-hidden="true" />
        </span>
        <div>
          <p className="font-black uppercase text-amber">{current.label}</p>
          <p className="text-xs font-bold uppercase text-cream/60">{error ?? current.detail}</p>
        </div>
      </div>
      <span className="h-3 w-3 rounded-full bg-mint shadow-[0_0_18px_rgba(18,255,208,0.9)]" />
    </div>
  );
}

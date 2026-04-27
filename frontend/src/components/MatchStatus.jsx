import { RadioTower, Search, Unplug, Users } from "lucide-react";

const statusMap = {
  connecting: {
    icon: RadioTower,
    label: "Connecting",
    detail: "Opening socket",
  },
  connected: {
    icon: RadioTower,
    label: "Connected",
    detail: "Joining queue",
  },
  waiting: {
    icon: Search,
    label: "Searching",
    detail: "Waiting for a peer",
  },
  matched: {
    icon: Users,
    label: "Matched",
    detail: "Session live",
  },
  disconnected: {
    icon: Unplug,
    label: "Disconnected",
    detail: "Retrying",
  },
};

export default function MatchStatus({ status, error }) {
  const current = statusMap[status] ?? statusMap.connecting;
  const Icon = current.icon;

  return (
    <div className="terminal-panel flex items-center justify-between gap-4 px-4 py-3 font-mono text-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center border border-line bg-ink text-amber">
          <Icon size={18} aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold text-cream">{current.label}</p>
          <p className="text-xs text-cream/60">{error ?? current.detail}</p>
        </div>
      </div>
      <span className="h-2.5 w-2.5 rounded-full bg-mint shadow-[0_0_14px_rgba(143,255,210,0.8)]" />
    </div>
  );
}

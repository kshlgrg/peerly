import { Home, RefreshCcw } from "lucide-react";
import { Link } from "react-router-dom";

export default function Controls({ onNext, disabled, children }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {children}
      <button
        className="command-button"
        type="button"
        onClick={onNext}
        disabled={disabled}
        title="Find another peer"
      >
        <RefreshCcw size={17} aria-hidden="true" />
        Skip
      </button>
      <Link className="icon-button" to="/" title="Home" aria-label="Home">
        <Home size={18} aria-hidden="true" />
      </Link>
    </div>
  );
}

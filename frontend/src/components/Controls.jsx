import { Flag, Home, RefreshCcw } from "lucide-react";
import { Link } from "react-router-dom";

export default function Controls({ onNext, onReport, disabled, reportDisabled }) {
  return (
    <div className="flex items-center gap-3">
      <button
        className="icon-button"
        type="button"
        onClick={onReport}
        disabled={disabled || reportDisabled}
        title="Report peer"
        aria-label="Report peer"
      >
        <Flag size={17} aria-hidden="true" />
      </button>
      <button
        className="command-button"
        type="button"
        onClick={onNext}
        disabled={disabled}
        title="Find another peer"
      >
        <RefreshCcw size={17} aria-hidden="true" />
        Next
      </button>
      <Link className="icon-button" to="/" title="Home" aria-label="Home">
        <Home size={18} aria-hidden="true" />
      </Link>
    </div>
  );
}

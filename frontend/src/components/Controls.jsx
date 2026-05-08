import { Home, RefreshCcw } from "lucide-react";
import { Link } from "react-router-dom";

// Shared room controls appear on both chat and video pages.
// children lets the chat page inject the "request video" button beside Skip/Home.
export default function Controls({ onNext, disabled, children }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Extra action slot, currently used by the chat-to-video request flow. */}
      {children}
      {/* Skip asks the backend to break the pair and requeue the current user. */}
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
      {/* Home leaves the current experience; the Home page resets the socket session. */}
      <Link className="icon-button" to="/" title="Home" aria-label="Home">
        <Home size={18} aria-hidden="true" />
      </Link>
    </div>
  );
}

import { Navigate, Route, Routes } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Chat from "./pages/Chat.jsx";
import Video from "./pages/Video.jsx";

export default function App() {
  return (
    // App is intentionally tiny: it only decides which page renders for each URL.
    <Routes>
      {/* Landing page: choose text or video mode. */}
      <Route path="/" element={<Home />} />
      {/* Text room: WebSocket chat, games, and optional video upgrade request. */}
      <Route path="/chat" element={<Chat />} />
      {/* Video room: WebRTC media plus the same shared chat/game session. */}
      <Route path="/video" element={<Video />} />
      {/* Unknown paths go home so demos never land on a blank screen. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { useEffect, useRef, useState } from "react";

import Controls from "../components/Controls.jsx";
import MatchStatus from "../components/MatchStatus.jsx";
import VideoBox from "../components/VideoBox.jsx";
import { useSocket } from "../hooks/useSocket.js";
import { useWebRTC } from "../hooks/useWebRTC.js";

export default function Video() {
  // The socket can receive WebRTC signals before the media hook is ready.
  // This ref lets the latest WebRTC handler receive those payloads.
  const signalHandlerRef = useRef(null);
  // Video mode waits for camera/mic permission before joining the queue once.
  const connectedOnceRef = useRef(false);
  // Alien filter toggles a processed outgoing audio track in useWebRTC.
  const [alienVoiceEnabled, setAlienVoiceEnabled] = useState(false);
  // autoConnect is false because video should not match before local media is ready.
  const socket = useSocket({
    mode: "video",
    onSignal: (payload) => signalHandlerRef.current?.(payload),
    autoConnect: false,
  });
  // WebRTC owns camera/mic streams, peer connection setup, and incoming signals.
  const webRTC = useWebRTC({
    status: socket.status,
    isInitiator: socket.isInitiator,
    sendSignal: socket.sendSignal,
    alienVoiceEnabled,
  });
  const reconnect = socket.reconnect;

  // Keep the socket's signal callback pointed at the newest WebRTC handler.
  useEffect(() => {
    signalHandlerRef.current = webRTC.handleSignal;
  }, [webRTC.handleSignal]);

  // Join the matching queue only after local camera/mic are available.
  useEffect(() => {
    if (webRTC.localReady && !connectedOnceRef.current) {
      connectedOnceRef.current = true;
      reconnect();
    }
  }, [reconnect, webRTC.localReady]);

  return (
    <main className="peerly-shell flex min-h-[100dvh] w-full flex-col gap-3 p-3 sm:gap-4 sm:p-4 lg:h-[100dvh] lg:overflow-hidden">
      <header className="relative z-10 mx-auto flex w-full max-w-7xl shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Same status and skip controls as text chat, but backed by a video-mode room. */}
        <MatchStatus status={socket.status} error={socket.error} />
        <Controls onNext={socket.next} disabled={socket.status === "connecting" || socket.status === "disconnected"} />
      </header>
      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-7xl flex-1 lg:h-full">
        <VideoBox
          // VideoBox renders the UI; hooks above provide the actual socket/media behavior.
          localVideoRef={webRTC.localVideoRef}
          remoteVideoRef={webRTC.remoteVideoRef}
          status={socket.status}
          localReady={webRTC.localReady}
          mediaError={webRTC.mediaError}
          messages={socket.messages}
          onSend={socket.sendChat}
          gameState={socket.gameState}
          gameError={socket.gameError}
          onGame={socket.sendGame}
          onAlienVoiceChange={setAlienVoiceEnabled}
          alienVoiceEnabled={alienVoiceEnabled}
        />
      </div>
    </main>
  );
}

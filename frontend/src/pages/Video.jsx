import { useEffect, useRef, useState } from "react";

import Controls from "../components/Controls.jsx";
import MatchStatus from "../components/MatchStatus.jsx";
import VideoBox from "../components/VideoBox.jsx";
import { useSocket } from "../hooks/useSocket.js";
import { useWebRTC } from "../hooks/useWebRTC.js";

export default function Video() {
  const signalHandlerRef = useRef(null);
  const connectedOnceRef = useRef(false);
  const [alienVoiceEnabled, setAlienVoiceEnabled] = useState(false);
  const socket = useSocket({
    mode: "video",
    onSignal: (payload) => signalHandlerRef.current?.(payload),
    autoConnect: false,
  });
  const webRTC = useWebRTC({
    status: socket.status,
    isInitiator: socket.isInitiator,
    sendSignal: socket.sendSignal,
    alienVoiceEnabled,
  });
  const reconnect = socket.reconnect;

  useEffect(() => {
    signalHandlerRef.current = webRTC.handleSignal;
  }, [webRTC.handleSignal]);

  useEffect(() => {
    if (webRTC.localReady && !connectedOnceRef.current) {
      connectedOnceRef.current = true;
      reconnect();
    }
  }, [reconnect, webRTC.localReady]);

  return (
    <main className="peerly-shell flex min-h-[100dvh] w-full flex-col gap-3 p-3 sm:gap-4 sm:p-4 lg:h-[100dvh] lg:overflow-hidden">
      <header className="relative z-10 mx-auto flex w-full max-w-7xl shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MatchStatus status={socket.status} error={socket.error} />
        <Controls onNext={socket.next} disabled={socket.status === "connecting" || socket.status === "disconnected"} />
      </header>
      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-7xl flex-1 lg:h-full">
        <VideoBox
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

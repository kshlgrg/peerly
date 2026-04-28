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
    <main className="mx-auto flex h-screen w-full max-w-7xl flex-col gap-4 p-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MatchStatus status={socket.status} error={socket.error} />
        <Controls
          onNext={socket.next}
          onReport={socket.report}
          disabled={socket.status === "connecting" || socket.status === "disconnected"}
          reportDisabled={socket.status !== "matched"}
        />
      </header>
      <VideoBox
        localVideoRef={webRTC.localVideoRef}
        remoteVideoRef={webRTC.remoteVideoRef}
        status={socket.status}
        localReady={webRTC.localReady}
        mediaError={webRTC.mediaError}
        messages={socket.messages}
        onSend={socket.sendChat}
        onAlienVoiceChange={setAlienVoiceEnabled}
        alienVoiceEnabled={alienVoiceEnabled}
      />
    </main>
  );
}

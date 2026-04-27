import { useCallback, useEffect, useRef, useState } from "react";

const RTC_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export function useWebRTC({ status, isInitiator, sendSignal }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const offerStartedRef = useRef(false);

  const [localReady, setLocalReady] = useState(false);
  const [mediaError, setMediaError] = useState(null);

  const attachRemoteStream = useCallback((stream) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
    }
  }, []);

  const closePeerConnection = useCallback(() => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    pendingCandidatesRef.current = [];
    offerStartedRef.current = false;
    attachRemoteStream(null);
  }, [attachRemoteStream]);

  const ensurePeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const peerConnection = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = peerConnection;

    localStreamRef.current?.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStreamRef.current);
    });

    peerConnection.addEventListener("icecandidate", (event) => {
      if (event.candidate) {
        sendSignal("ice", event.candidate);
      }
    });

    peerConnection.addEventListener("track", (event) => {
      attachRemoteStream(event.streams[0]);
    });

    return peerConnection;
  }, [attachRemoteStream, sendSignal]);

  const flushPendingIce = useCallback(async (peerConnection) => {
    const candidates = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];

    for (const candidate of candidates) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  const handleSignal = useCallback(
    async (payload) => {
      const peerConnection = ensurePeerConnection();

      if (payload.type === "offer") {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.data));
        await flushPendingIce(peerConnection);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        sendSignal("answer", answer);
      }

      if (payload.type === "answer") {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.data));
        await flushPendingIce(peerConnection);
      }

      if (payload.type === "ice") {
        if (peerConnection.remoteDescription) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(payload.data));
        } else {
          pendingCandidatesRef.current.push(payload.data);
        }
      }
    },
    [ensurePeerConnection, flushPendingIce, sendSignal],
  );

  useEffect(() => {
    let cancelled = false;

    async function startMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        peerConnectionRef.current &&
          stream.getTracks().forEach((track) => {
            peerConnectionRef.current.addTrack(track, stream);
          });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setLocalReady(true);
      } catch (error) {
        setMediaError(error.message || "Could not access camera or microphone.");
      }
    }

    startMedia();

    return () => {
      cancelled = true;
      closePeerConnection();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    };
  }, [closePeerConnection]);

  useEffect(() => {
    if (status !== "matched") {
      closePeerConnection();
      return;
    }

    if (!localReady || !isInitiator || offerStartedRef.current) {
      return;
    }

    async function startOffer() {
      offerStartedRef.current = true;
      const peerConnection = ensurePeerConnection();
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      sendSignal("offer", offer);
    }

    startOffer().catch((error) => {
      setMediaError(error.message || "Could not start video chat.");
      offerStartedRef.current = false;
    });
  }, [closePeerConnection, ensurePeerConnection, isInitiator, localReady, sendSignal, status]);

  return {
    localVideoRef,
    remoteVideoRef,
    localReady,
    mediaError,
    handleSignal,
  };
}

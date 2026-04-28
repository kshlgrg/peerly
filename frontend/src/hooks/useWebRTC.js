import { useCallback, useEffect, useRef, useState } from "react";

const RTC_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export function useWebRTC({ status, isInitiator, sendSignal, alienVoiceEnabled = false }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const rawStreamRef = useRef(null);
  const rawAudioTrackRef = useRef(null);
  const alienAudioRef = useRef(null);
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

  const stopAlienAudio = useCallback(() => {
    alienAudioRef.current?.track?.stop();
    alienAudioRef.current?.oscillator?.stop();
    alienAudioRef.current?.audioContext?.close();
    alienAudioRef.current = null;
  }, []);

  const createAlienAudioTrack = useCallback(() => {
    const rawAudioTrack = rawAudioTrackRef.current;
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;

    if (!rawAudioTrack || !AudioContextConstructor) {
      return rawAudioTrack;
    }

    stopAlienAudio();

    const audioContext = new AudioContextConstructor();
    const source = audioContext.createMediaStreamSource(new MediaStream([rawAudioTrack]));
    const bandpass = audioContext.createBiquadFilter();
    const shaper = audioContext.createWaveShaper();
    const modulator = audioContext.createGain();
    const oscillator = audioContext.createOscillator();
    const oscillatorDepth = audioContext.createGain();
    const destination = audioContext.createMediaStreamDestination();

    const curve = new Float32Array(256);
    for (let index = 0; index < curve.length; index += 1) {
      const x = (index * 2) / curve.length - 1;
      curve[index] = Math.tanh(2.4 * x);
    }

    bandpass.type = "bandpass";
    bandpass.frequency.value = 920;
    bandpass.Q.value = 3.5;
    shaper.curve = curve;
    shaper.oversample = "4x";
    modulator.gain.value = 0.62;
    oscillator.type = "sine";
    oscillator.frequency.value = 38;
    oscillatorDepth.gain.value = 0.28;

    source.connect(bandpass);
    bandpass.connect(shaper);
    shaper.connect(modulator);
    oscillator.connect(oscillatorDepth);
    oscillatorDepth.connect(modulator.gain);
    modulator.connect(destination);
    oscillator.start();
    audioContext.resume?.();

    const [track] = destination.stream.getAudioTracks();
    alienAudioRef.current = { audioContext, oscillator, track };

    return track;
  }, [stopAlienAudio]);

  const replaceOutgoingAudioTrack = useCallback((track) => {
    const audioSender = peerConnectionRef.current
      ?.getSenders()
      .find((sender) => sender.track?.kind === "audio");

    audioSender?.replaceTrack(track ?? null);
  }, []);

  const applyAudioMode = useCallback(() => {
    const rawStream = rawStreamRef.current;
    if (!rawStream) {
      return;
    }

    const videoTracks = rawStream.getVideoTracks();
    const audioTrack = alienVoiceEnabled ? createAlienAudioTrack() : rawAudioTrackRef.current;

    if (!alienVoiceEnabled) {
      stopAlienAudio();
    }

    const nextStream = new MediaStream([...videoTracks, ...(audioTrack ? [audioTrack] : [])]);
    localStreamRef.current = nextStream;
    replaceOutgoingAudioTrack(audioTrack);

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = nextStream;
    }
  }, [alienVoiceEnabled, createAlienAudioTrack, replaceOutgoingAudioTrack, stopAlienAudio]);

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

        rawStreamRef.current = stream;
        rawAudioTrackRef.current = stream.getAudioTracks()[0] ?? null;
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
      stopAlienAudio();
      rawStreamRef.current?.getTracks().forEach((track) => track.stop());
      rawStreamRef.current = null;
      rawAudioTrackRef.current = null;
      localStreamRef.current = null;
    };
  }, [closePeerConnection, stopAlienAudio]);

  useEffect(() => {
    if (localReady) {
      applyAudioMode();
    }
  }, [applyAudioMode, localReady]);

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

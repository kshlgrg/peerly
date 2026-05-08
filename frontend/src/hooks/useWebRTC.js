import { useCallback, useEffect, useRef, useState } from "react";

// Public STUN server lets peers discover network routes for browser-to-browser media.
const RTC_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// Owns camera/mic access, RTCPeerConnection setup, signaling, and the alien voice effect.
export function useWebRTC({ status, isInitiator, sendSignal, alienVoiceEnabled = false }) {
  // Video elements are controlled by refs so streams can be attached directly.
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  // Peer connection and streams live in refs because changing them should not rerender UI.
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const rawStreamRef = useRef(null);
  const rawAudioTrackRef = useRef(null);
  // Alien audio nodes are stored so they can be stopped cleanly.
  const alienAudioRef = useRef(null);
  // ICE candidates can arrive before remoteDescription is set, so they wait here.
  const pendingCandidatesRef = useRef([]);
  // Prevents the initiator from creating duplicate offers.
  const offerStartedRef = useRef(false);

  // localReady unlocks queue joining on the Video page.
  const [localReady, setLocalReady] = useState(false);
  const [mediaError, setMediaError] = useState(null);

  // Attach or clear the remote MediaStream on the remote video element.
  const attachRemoteStream = useCallback((stream) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
    }
  }, []);

  // Close the peer connection when leaving a match or resetting the session.
  const closePeerConnection = useCallback(() => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    pendingCandidatesRef.current = [];
    offerStartedRef.current = false;
    attachRemoteStream(null);
  }, [attachRemoteStream]);

  // Stop any synthetic alien voice audio graph.
  const stopAlienAudio = useCallback(() => {
    alienAudioRef.current?.track?.stop();
    alienAudioRef.current?.oscillator?.stop();
    alienAudioRef.current?.audioContext?.close();
    alienAudioRef.current = null;
  }, []);

  // Builds a processed audio track using Web Audio nodes for the alien filter.
  const createAlienAudioTrack = useCallback(() => {
    const rawAudioTrack = rawAudioTrackRef.current;
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;

    // If the browser has no audio track/API, fall back to the normal microphone.
    if (!rawAudioTrack || !AudioContextConstructor) {
      return rawAudioTrack;
    }

    // Reset old nodes before creating a fresh audio graph.
    stopAlienAudio();

    const audioContext = new AudioContextConstructor();
    const source = audioContext.createMediaStreamSource(new MediaStream([rawAudioTrack]));
    const bandpass = audioContext.createBiquadFilter();
    const shaper = audioContext.createWaveShaper();
    const modulator = audioContext.createGain();
    const oscillator = audioContext.createOscillator();
    const oscillatorDepth = audioContext.createGain();
    const destination = audioContext.createMediaStreamDestination();

    // Distortion curve creates the crunchy "alien" texture.
    const curve = new Float32Array(256);
    for (let index = 0; index < curve.length; index += 1) {
      const x = (index * 2) / curve.length - 1;
      curve[index] = Math.tanh(2.4 * x);
    }

    // Configure the filter chain: bandpass -> distortion -> amplitude modulation.
    bandpass.type = "bandpass";
    bandpass.frequency.value = 920;
    bandpass.Q.value = 3.5;
    shaper.curve = curve;
    shaper.oversample = "4x";
    modulator.gain.value = 0.62;
    oscillator.type = "sine";
    oscillator.frequency.value = 38;
    oscillatorDepth.gain.value = 0.28;

    // Wire nodes into the destination stream and start the oscillator.
    source.connect(bandpass);
    bandpass.connect(shaper);
    shaper.connect(modulator);
    oscillator.connect(oscillatorDepth);
    oscillatorDepth.connect(modulator.gain);
    modulator.connect(destination);
    oscillator.start();
    audioContext.resume?.();

    // Return the processed track so it can replace the outgoing mic track.
    const [track] = destination.stream.getAudioTracks();
    alienAudioRef.current = { audioContext, oscillator, track };

    return track;
  }, [stopAlienAudio]);

  // Replace the audio track already being sent to the peer without rebuilding video.
  const replaceOutgoingAudioTrack = useCallback((track) => {
    const audioSender = peerConnectionRef.current
      ?.getSenders()
      .find((sender) => sender.track?.kind === "audio");

    audioSender?.replaceTrack(track ?? null);
  }, []);

  // Rebuild local stream when alien voice toggles, keeping video track unchanged.
  const applyAudioMode = useCallback(() => {
    const rawStream = rawStreamRef.current;
    if (!rawStream) {
      return;
    }

    const videoTracks = rawStream.getVideoTracks();
    const audioTrack = alienVoiceEnabled ? createAlienAudioTrack() : rawAudioTrackRef.current;

    // Turning alien off should stop the synthetic audio graph immediately.
    if (!alienVoiceEnabled) {
      stopAlienAudio();
    }

    // Local preview shows the same stream that is sent to the peer.
    const nextStream = new MediaStream([...videoTracks, ...(audioTrack ? [audioTrack] : [])]);
    localStreamRef.current = nextStream;
    replaceOutgoingAudioTrack(audioTrack);

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = nextStream;
    }
  }, [alienVoiceEnabled, createAlienAudioTrack, replaceOutgoingAudioTrack, stopAlienAudio]);

  // Lazily create the peer connection and attach local tracks/signaling listeners.
  const ensurePeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const peerConnection = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = peerConnection;

    // Add every local camera/mic track to the outgoing WebRTC connection.
    localStreamRef.current?.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStreamRef.current);
    });

    // ICE candidates are sent to the backend, then forwarded to the partner.
    peerConnection.addEventListener("icecandidate", (event) => {
      if (event.candidate) {
        sendSignal("ice", event.candidate);
      }
    });

    // Remote media arrives through track events and is attached to the remote video tag.
    peerConnection.addEventListener("track", (event) => {
      attachRemoteStream(event.streams[0]);
    });

    return peerConnection;
  }, [attachRemoteStream, sendSignal]);

  // Add ICE candidates that arrived before remoteDescription was ready.
  const flushPendingIce = useCallback(async (peerConnection) => {
    const candidates = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];

    for (const candidate of candidates) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  // Handle offer/answer/ice messages delivered from the WebSocket hook.
  const handleSignal = useCallback(
    async (payload) => {
      const peerConnection = ensurePeerConnection();

      // Offer means the partner started negotiation; answer with local media details.
      if (payload.type === "offer") {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.data));
        await flushPendingIce(peerConnection);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        sendSignal("answer", answer);
      }

      // Answer completes the initiator's negotiation path.
      if (payload.type === "answer") {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.data));
        await flushPendingIce(peerConnection);
      }

      // ICE candidates may need to wait until after remoteDescription is set.
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

  // Ask the browser for camera/mic once when the video hook mounts.
  useEffect(() => {
    let cancelled = false;

    async function startMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        // If the component unmounted during permission prompt, stop the granted tracks.
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        // Save the raw stream/tracks so filters can rebuild processed streams later.
        rawStreamRef.current = stream;
        rawAudioTrackRef.current = stream.getAudioTracks()[0] ?? null;
        localStreamRef.current = stream;
        peerConnectionRef.current &&
          stream.getTracks().forEach((track) => {
            peerConnectionRef.current.addTrack(track, stream);
          });
        // Show the local camera preview immediately after permission succeeds.
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
      // Cleanup prevents camera/mic from staying on after leaving the video page.
      cancelled = true;
      closePeerConnection();
      stopAlienAudio();
      rawStreamRef.current?.getTracks().forEach((track) => track.stop());
      rawStreamRef.current = null;
      rawAudioTrackRef.current = null;
      localStreamRef.current = null;
    };
  }, [closePeerConnection, stopAlienAudio]);

  // Reapply audio mode whenever the alien filter changes after media is ready.
  useEffect(() => {
    if (localReady) {
      applyAudioMode();
    }
  }, [applyAudioMode, localReady]);

  // Once matched, the initiator creates the offer that starts WebRTC negotiation.
  useEffect(() => {
    if (status !== "matched") {
      closePeerConnection();
      return;
    }

    if (!localReady || !isInitiator || offerStartedRef.current) {
      return;
    }

    async function startOffer() {
      // Mark first so duplicate renders do not produce multiple offers.
      offerStartedRef.current = true;
      const peerConnection = ensurePeerConnection();
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      sendSignal("offer", offer);
    }

    startOffer().catch((error) => {
      // Let the user see offer failures and allow another attempt later.
      setMediaError(error.message || "Could not start video chat.");
      offerStartedRef.current = false;
    });
  }, [closePeerConnection, ensurePeerConnection, isInitiator, localReady, sendSignal, status]);

  // Expose refs/state/handler to the Video page and VideoBox component.
  return {
    localVideoRef,
    remoteVideoRef,
    localReady,
    mediaError,
    handleSignal,
  };
}

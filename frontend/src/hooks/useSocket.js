import { useCallback, useEffect, useMemo, useRef } from "react";

import { useSessionStore } from "../store/sessionStore.js";

// One shared socket is kept across route changes so chat can upgrade to video without losing state.
const sharedConnection = {
  socket: null,
  reconnectTimer: null,
  shouldReconnect: true,
  connect: null,
  socketUrl: null,
};

// The video page registers this handler when WebRTC is ready to receive signals.
let activeOnSignal = null;
// Hold WebRTC signaling messages until the video hook has registered its handler.
const pendingSignals = [];

// Replay queued offer/answer/ice payloads after the video handler mounts.
function flushPendingSignals() {
  if (!activeOnSignal) {
    return;
  }

  while (pendingSignals.length > 0) {
    activeOnSignal(pendingSignals.shift());
  }
}

// Queue WebRTC signals if they arrive during a route transition.
function deliverSignal(payload) {
  if (!activeOnSignal) {
    pendingSignals.push(payload);
    return;
  }

  window.setTimeout(() => {
    if (activeOnSignal) {
      activeOnSignal(payload);
    } else {
      pendingSignals.push(payload);
    }
  }, 0);
}

// Resolve the WebSocket URL for local development or same-host production deploys.
function defaultSocketUrl() {
  const { protocol, hostname, host } = window.location;
  const socketProtocol = protocol === "https:" ? "wss" : "ws";
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  const socketHost = isLocal ? `${hostname}:8000` : host;
  return `${socketProtocol}://${socketHost}/ws`;
}

// Main client protocol hook: matching, chat, games, reports, video requests, and WebRTC signals.
export function useSocket({ mode, onSignal, autoConnect = true }) {
  // VITE_WS_URL can point the frontend at Render or another hosted backend.
  const socketUrl = useMemo(() => import.meta.env.VITE_WS_URL ?? defaultSocketUrl(), []);
  // Ref avoids stale callback cleanup when React rerenders the video page.
  const onSignalRef = useRef(onSignal);

  const {
    status,
    mode: activeMode,
    messages,
    isInitiator,
    error,
    gameState,
    gameError,
    videoRequest,
    setClientId,
    setMode,
    setStatus,
    setInitiator,
    setError,
    setGameState,
    setGameError,
    setVideoRequest,
    clearVideoRequest,
    addMessage,
    clearMessages,
    clearGame,
  } = useSessionStore();

  // Keep the global signal receiver pointed at the current video hook.
  useEffect(() => {
    onSignalRef.current = onSignal;
    activeOnSignal = onSignal;
    if (onSignal) {
      window.setTimeout(flushPendingSignals, 0);
    }

    return () => {
      if (activeOnSignal === onSignalRef.current) {
        activeOnSignal = null;
      }
    };
  }, [onSignal]);

  // JSON-send helper shared by every user action below.
  const send = useCallback((payload) => {
    const socket = sharedConnection.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    socket.send(JSON.stringify(payload));
    return true;
  }, []);

  // Opens the socket, joins the requested queue, and wires all server event handlers.
  const connect = useCallback(() => {
    window.clearTimeout(sharedConnection.reconnectTimer);
    // Avoid duplicate sockets if connect is called while a socket is already active.
    if (
      sharedConnection.socket?.readyState === WebSocket.OPEN ||
      sharedConnection.socket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    // Mark this connection as intentional so close events can auto-retry.
    sharedConnection.shouldReconnect = true;
    sharedConnection.socketUrl = socketUrl;
    setMode(mode);
    setStatus("connecting");
    setError(null);

    // Replace any stale connection before creating the fresh socket.
    sharedConnection.socket?.close(1000, "reconnecting");

    const socket = new WebSocket(socketUrl);
    sharedConnection.socket = socket;

    // Once the socket opens, ask the backend to place this client in the mode queue.
    socket.addEventListener("open", () => {
      if (sharedConnection.socket !== socket) {
        return;
      }
      setStatus("connected");
      send({ type: "join", mode });
    });

    // Parse every backend event and translate it into Zustand state.
    socket.addEventListener("message", (event) => {
      if (sharedConnection.socket !== socket) {
        return;
      }
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        setError("Received an invalid server message.");
        return;
      }

      // The switch is the client-side map of the backend WebSocket protocol.
      switch (payload.type) {
        case "connected":
          // Store the backend-assigned client id for debugging/session context.
          setClientId(payload.clientId);
          break;
        case "waiting":
          // Waiting means no partner yet, so this client is not the WebRTC initiator.
          setStatus("waiting");
          setInitiator(false);
          break;
        case "matched":
          // A fresh match clears prior room state before showing the system message.
          clearMessages();
          clearGame();
          clearVideoRequest();
          setMode(payload.mode ?? mode);
          setStatus("matched");
          setInitiator(Boolean(payload.initiator));
          addMessage({
            role: "system",
            text: "Match found. Try not to be boring.",
            sentAt: payload.matchedAt,
          });
          break;
        case "mode_changed":
          // Accepted video upgrade changes the route mode while keeping chat history.
          clearVideoRequest();
          setMode(payload.mode);
          setStatus("matched");
          setInitiator(Boolean(payload.initiator));
          addMessage({
            role: "system",
            text: payload.message ?? "Mode changed. The chat receipts survived.",
            sentAt: payload.changedAt,
          });
          break;
        case "partner_left":
          // Partner leaving returns this user to waiting and clears room-only state.
          setStatus("waiting");
          setInitiator(false);
          clearGame();
          clearVideoRequest();
          addMessage({
            role: "system",
            text: payload.message ?? "They dipped. Queueing a better plot twist...",
          });
          break;
        case "video_request":
          // Incoming request creates accept/decline UI in Chat.jsx.
          setVideoRequest({ direction: "incoming", message: payload.message, requestedAt: payload.requestedAt });
          addMessage({
            role: "system",
            text: payload.message ?? "Video request incoming. Choose wisely.",
            sentAt: payload.requestedAt,
          });
          break;
        case "video_request_sent":
          // Outgoing request creates the "awaiting verdict" UI in Chat.jsx.
          setVideoRequest({ direction: "outgoing", message: payload.message, requestedAt: payload.requestedAt });
          addMessage({
            role: "system",
            text: payload.message ?? "Video request sent. Awaiting their verdict.",
            sentAt: payload.requestedAt,
          });
          break;
        case "video_request_resolved":
          // Resolution clears the pending request; accepted requests also send mode_changed.
          clearVideoRequest();
          addMessage({
            role: "system",
            text: payload.message ?? (payload.accepted ? "Video request accepted." : "Video request declined."),
            sentAt: payload.respondedAt,
          });
          break;
        case "message":
          // Peer messages join the shared timeline used by chat and video side chat.
          addMessage({
            role: "peer",
            text: payload.data,
            sentAt: payload.sentAt,
          });
          break;
        case "offer":
        case "answer":
        case "ice":
          // WebRTC negotiation is delivered to useWebRTC, or queued if it is not mounted yet.
          deliverSignal(payload);
          break;
        case "error":
          setError(payload.message);
          break;
        case "reported":
          // Report acknowledgement appears as a system message.
          addMessage({
            role: "system",
            text: payload.message ?? "Report received.",
            sentAt: new Date().toISOString(),
          });
          break;
        case "game_state":
          // The server owns game rules; the client renders the latest full state.
          setGameState(payload.data);
          break;
        case "game_error":
          // Invalid moves or bad game actions show inside MiniGames.
          setGameError(payload.message);
          break;
        default:
          break;
      }
    });

    // Unexpected close retries after a short delay; intentional disconnect disables this.
    socket.addEventListener("close", () => {
      if (sharedConnection.socket !== socket) {
        return;
      }
      setStatus("disconnected");
      if (sharedConnection.shouldReconnect) {
        sharedConnection.reconnectTimer = window.setTimeout(() => {
          sharedConnection.connect?.();
        }, 1600);
      }
    });

    // Browser socket errors get surfaced in the status bar.
    socket.addEventListener("error", () => {
      if (sharedConnection.socket !== socket) {
        return;
      }
      setError("Connection problem. Retrying...");
    });
  }, [
    addMessage,
    clearGame,
    clearMessages,
    mode,
    send,
    setClientId,
    clearVideoRequest,
    setError,
    setGameError,
    setGameState,
    setInitiator,
    setMode,
    setStatus,
    setVideoRequest,
    socketUrl,
  ]);

  useEffect(() => {
    // Save reconnect function globally so close handlers can call the newest version.
    sharedConnection.connect = connect;
  }, [connect]);

  useEffect(() => {
    // Most flows connect immediately; video passes autoConnect=false until media is ready.
    if (autoConnect) {
      connect();
    }

    return undefined;
  }, [autoConnect, connect]);

  // Send a chat message and add it locally immediately for snappy UI feedback.
  const sendChat = useCallback(
    (text) => {
      const cleanText = text.trim();
      if (!cleanText) {
        return;
      }

      addMessage({ role: "me", text: cleanText, sentAt: new Date().toISOString() });
      send({ type: "message", data: cleanText });
    },
    [addMessage, send],
  );

  // WebRTC offers, answers, and ICE candidates are tunneled through the same socket.
  const sendSignal = useCallback(
    (type, data) => {
      send({ type, data });
    },
    [send],
  );

  // Skip clears the local room and asks the backend to find a new partner.
  const next = useCallback(() => {
    clearMessages();
    clearGame();
    clearVideoRequest();
    setStatus("waiting");
    setInitiator(false);
    send({ type: "next" });
  }, [clearGame, clearMessages, clearVideoRequest, send, setInitiator, setStatus]);

  // Request video without losing text chat; backend waits for partner consent.
  const upgradeToVideo = useCallback(() => {
    if (send({ type: "video_request" })) {
      addMessage({
        role: "system",
        text: "Requesting video. Chat receipts stay armed.",
        sentAt: new Date().toISOString(),
      });
    }
  }, [addMessage, send]);

  // Accept/decline a partner's video request.
  const respondToVideoRequest = useCallback(
    (accepted) => {
      clearVideoRequest();
      send({ type: "video_response", accepted });
    },
    [clearVideoRequest, send],
  );

  // Send a report event for the current room.
  const report = useCallback(() => {
    send({ type: "report", data: "User reported from client controls." });
  }, [send]);

  // Forward mini-game actions to the backend referee.
  const sendGame = useCallback(
    (data) => {
      send({ type: "game", data });
    },
    [send],
  );

  // Pages use this returned object as their realtime API.
  return {
    status,
    mode: activeMode,
    messages,
    isInitiator,
    error,
    gameState,
    gameError,
    videoRequest,
    sendChat,
    sendSignal,
    sendGame,
    upgradeToVideo,
    respondToVideoRequest,
    next,
    report,
    reconnect: connect,
    disconnect: disconnectSocketSession,
  };
}

// Used by the Home page to fully leave/reset the current realtime session.
export function disconnectSocketSession() {
  window.clearTimeout(sharedConnection.reconnectTimer);
  sharedConnection.shouldReconnect = false;
  sharedConnection.socket?.close(1000, "leaving room");
  sharedConnection.socket = null;
  pendingSignals.length = 0;
  useSessionStore.getState().resetSession();
}

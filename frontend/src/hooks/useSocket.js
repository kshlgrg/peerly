import { useCallback, useEffect, useMemo, useRef } from "react";

import { useSessionStore } from "../store/sessionStore.js";

const sharedConnection = {
  socket: null,
  reconnectTimer: null,
  shouldReconnect: true,
  connect: null,
  socketUrl: null,
};

let activeOnSignal = null;
const pendingSignals = [];

function flushPendingSignals() {
  if (!activeOnSignal) {
    return;
  }

  while (pendingSignals.length > 0) {
    activeOnSignal(pendingSignals.shift());
  }
}

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

function defaultSocketUrl() {
  const { protocol, hostname, host } = window.location;
  const socketProtocol = protocol === "https:" ? "wss" : "ws";
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  const socketHost = isLocal ? `${hostname}:8000` : host;
  return `${socketProtocol}://${socketHost}/ws`;
}

export function useSocket({ mode, onSignal, autoConnect = true }) {
  const socketUrl = useMemo(() => import.meta.env.VITE_WS_URL ?? defaultSocketUrl(), []);
  const onSignalRef = useRef(onSignal);

  const {
    status,
    mode: activeMode,
    messages,
    isInitiator,
    error,
    gameState,
    gameError,
    setClientId,
    setMode,
    setStatus,
    setInitiator,
    setError,
    setGameState,
    setGameError,
    addMessage,
    clearMessages,
    clearGame,
  } = useSessionStore();

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

  const send = useCallback((payload) => {
    const socket = sharedConnection.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    socket.send(JSON.stringify(payload));
    return true;
  }, []);

  const connect = useCallback(() => {
    window.clearTimeout(sharedConnection.reconnectTimer);
    if (
      sharedConnection.socket?.readyState === WebSocket.OPEN ||
      sharedConnection.socket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    sharedConnection.shouldReconnect = true;
    sharedConnection.socketUrl = socketUrl;
    setMode(mode);
    setStatus("connecting");
    setError(null);

    sharedConnection.socket?.close(1000, "reconnecting");

    const socket = new WebSocket(socketUrl);
    sharedConnection.socket = socket;

    socket.addEventListener("open", () => {
      if (sharedConnection.socket !== socket) {
        return;
      }
      setStatus("connected");
      send({ type: "join", mode });
    });

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

      switch (payload.type) {
        case "connected":
          setClientId(payload.clientId);
          break;
        case "waiting":
          setStatus("waiting");
          setInitiator(false);
          break;
        case "matched":
          clearMessages();
          clearGame();
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
          setStatus("waiting");
          setInitiator(false);
          clearGame();
          addMessage({
            role: "system",
            text: payload.message ?? "They dipped. Queueing a better plot twist...",
          });
          break;
        case "message":
          addMessage({
            role: "peer",
            text: payload.data,
            sentAt: payload.sentAt,
          });
          break;
        case "offer":
        case "answer":
        case "ice":
          deliverSignal(payload);
          break;
        case "error":
          setError(payload.message);
          break;
        case "reported":
          addMessage({
            role: "system",
            text: payload.message ?? "Report received.",
            sentAt: new Date().toISOString(),
          });
          break;
        case "game_state":
          setGameState(payload.data);
          break;
        case "game_error":
          setGameError(payload.message);
          break;
        default:
          break;
      }
    });

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
    setError,
    setGameError,
    setGameState,
    setInitiator,
    setMode,
    setStatus,
    socketUrl,
  ]);

  useEffect(() => {
    sharedConnection.connect = connect;
  }, [connect]);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return undefined;
  }, [autoConnect, connect]);

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

  const sendSignal = useCallback(
    (type, data) => {
      send({ type, data });
    },
    [send],
  );

  const next = useCallback(() => {
    clearMessages();
    clearGame();
    setStatus("waiting");
    setInitiator(false);
    send({ type: "next" });
  }, [clearGame, clearMessages, send, setInitiator, setStatus]);

  const upgradeToVideo = useCallback(() => {
    if (send({ type: "upgrade", mode: "video" })) {
      addMessage({
        role: "system",
        text: "Video request sent. Chat history is staying put.",
        sentAt: new Date().toISOString(),
      });
    }
  }, [addMessage, send]);

  const report = useCallback(() => {
    send({ type: "report", data: "User reported from client controls." });
  }, [send]);

  const sendGame = useCallback(
    (data) => {
      send({ type: "game", data });
    },
    [send],
  );

  return {
    status,
    mode: activeMode,
    messages,
    isInitiator,
    error,
    gameState,
    gameError,
    sendChat,
    sendSignal,
    sendGame,
    upgradeToVideo,
    next,
    report,
    reconnect: connect,
    disconnect: disconnectSocketSession,
  };
}

export function disconnectSocketSession() {
  window.clearTimeout(sharedConnection.reconnectTimer);
  sharedConnection.shouldReconnect = false;
  sharedConnection.socket?.close(1000, "leaving room");
  sharedConnection.socket = null;
  pendingSignals.length = 0;
  useSessionStore.getState().resetSession();
}

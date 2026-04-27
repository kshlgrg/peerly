import { useCallback, useEffect, useMemo, useRef } from "react";

import { useSessionStore } from "../store/sessionStore.js";

function defaultSocketUrl() {
  const { protocol, hostname, host } = window.location;
  const socketProtocol = protocol === "https:" ? "wss" : "ws";
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  const socketHost = isLocal ? `${hostname}:8000` : host;
  return `${socketProtocol}://${socketHost}/ws`;
}

export function useSocket({ mode, onSignal, autoConnect = true }) {
  const socketUrl = useMemo(() => import.meta.env.VITE_WS_URL ?? defaultSocketUrl(), []);
  const socketRef = useRef(null);
  const connectRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const shouldReconnectRef = useRef(true);
  const onSignalRef = useRef(onSignal);

  const {
    status,
    messages,
    isInitiator,
    error,
    setClientId,
    setMode,
    setStatus,
    setInitiator,
    setError,
    addMessage,
    clearMessages,
    resetSession,
  } = useSessionStore();

  useEffect(() => {
    onSignalRef.current = onSignal;
  }, [onSignal]);

  const send = useCallback((payload) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    socket.send(JSON.stringify(payload));
    return true;
  }, []);

  const connect = useCallback(() => {
    window.clearTimeout(reconnectTimerRef.current);
    if (
      socketRef.current?.readyState === WebSocket.OPEN ||
      socketRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    shouldReconnectRef.current = true;
    setMode(mode);
    setStatus("connecting");
    setError(null);

    socketRef.current?.close(1000, "reconnecting");

    const socket = new WebSocket(socketUrl);
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      if (socketRef.current !== socket) {
        return;
      }
      setStatus("connected");
      send({ type: "join", mode });
    });

    socket.addEventListener("message", (event) => {
      if (socketRef.current !== socket) {
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
          setStatus("matched");
          setInitiator(Boolean(payload.initiator));
          addMessage({
            role: "system",
            text: "Matched with a peer.",
            sentAt: payload.matchedAt,
          });
          break;
        case "partner_left":
          setStatus("waiting");
          setInitiator(false);
          addMessage({
            role: "system",
            text: payload.message ?? "Your peer left. Looking for a new match...",
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
          onSignalRef.current?.(payload);
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
        default:
          break;
      }
    });

    socket.addEventListener("close", () => {
      if (socketRef.current !== socket) {
        return;
      }
      setStatus("disconnected");
      if (shouldReconnectRef.current) {
        reconnectTimerRef.current = window.setTimeout(() => {
          connectRef.current?.();
        }, 1600);
      }
    });

    socket.addEventListener("error", () => {
      if (socketRef.current !== socket) {
        return;
      }
      setError("Connection problem. Retrying...");
    });
  }, [
    addMessage,
    clearMessages,
    mode,
    send,
    setClientId,
    setError,
    setInitiator,
    setMode,
    setStatus,
    socketUrl,
  ]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      window.clearTimeout(reconnectTimerRef.current);
      shouldReconnectRef.current = false;
      socketRef.current?.close(1000, "page changed");
      socketRef.current = null;
      resetSession();
    };
  }, [autoConnect, connect, resetSession]);

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
    setStatus("waiting");
    setInitiator(false);
    send({ type: "next" });
  }, [clearMessages, send, setInitiator, setStatus]);

  const report = useCallback(() => {
    send({ type: "report", data: "User reported from client controls." });
  }, [send]);

  return {
    status,
    messages,
    isInitiator,
    error,
    sendChat,
    sendSignal,
    next,
    report,
    reconnect: connect,
  };
}

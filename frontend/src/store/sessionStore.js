import { create } from "zustand";

// This object is the single reset point for the whole realtime session.
// Whenever the user leaves a room, goes home, or disconnects, the store returns here.
const initialState = {
  // The backend assigns this id after the WebSocket connects.
  clientId: null,
  // UI status drives loading overlays, disabled buttons, and match labels.
  status: "idle",
  // Mode is either text or video, and it survives chat-to-video upgrades.
  mode: null,
  // WebRTC needs one peer to create the offer first; the backend chooses that peer.
  isInitiator: false,
  // Messages stay in Zustand so chat can survive route changes like chat -> video.
  messages: [],
  // Mini game state is server-owned, but the latest snapshot lives here for rendering.
  gameState: null,
  // Game errors are separate from app errors so they can appear inside the arcade panel.
  gameError: null,
  // Holds incoming/outgoing video upgrade requests until accepted or declined.
  videoRequest: null,
  // General connection or protocol errors shown near the match status.
  error: null,
};

// Zustand gives all routes/components the same session object without prop drilling.
export const useSessionStore = create((set) => ({
  ...initialState,
  // Small setters keep socket event handling readable in useSocket.
  setClientId: (clientId) => set({ clientId }),
  setMode: (mode) => set({ mode }),
  setStatus: (status) => set({ status }),
  setInitiator: (isInitiator) => set({ isInitiator }),
  setError: (error) => set({ error }),
  // A valid game state clears the previous game error because the server accepted the move.
  setGameState: (gameState) => set({ gameState, gameError: null }),
  setGameError: (gameError) => set({ gameError }),
  clearGame: () => set({ gameState: null, gameError: null }),
  setVideoRequest: (videoRequest) => set({ videoRequest }),
  clearVideoRequest: () => set({ videoRequest: null }),
  // Every displayed message gets a local id so React can render stable chat bubbles.
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, { id: crypto.randomUUID(), ...message }],
    })),
  clearMessages: () => set({ messages: [] }),
  // Full reset is used when leaving the app flow, not when upgrading chat to video.
  resetSession: () => set({ ...initialState }),
}));

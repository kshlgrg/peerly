import { create } from "zustand";

const initialState = {
  clientId: null,
  status: "idle",
  mode: null,
  isInitiator: false,
  messages: [],
  gameState: null,
  gameError: null,
  error: null,
};

export const useSessionStore = create((set) => ({
  ...initialState,
  setClientId: (clientId) => set({ clientId }),
  setMode: (mode) => set({ mode }),
  setStatus: (status) => set({ status }),
  setInitiator: (isInitiator) => set({ isInitiator }),
  setError: (error) => set({ error }),
  setGameState: (gameState) => set({ gameState, gameError: null }),
  setGameError: (gameError) => set({ gameError }),
  clearGame: () => set({ gameState: null, gameError: null }),
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, { id: crypto.randomUUID(), ...message }],
    })),
  clearMessages: () => set({ messages: [] }),
  resetSession: () => set({ ...initialState }),
}));

// client/src/stores/playerSessionStore.ts
import { create } from "zustand";
import type { PlayerType } from "../types";

interface PlayerSessionStore {
  selectedPlayer: PlayerType | null;
  setSelectedPlayer: (player: PlayerType | null) => void;
  clearSession: () => void;
}

export const usePlayerSessionStore = create<PlayerSessionStore>((set) => ({
  selectedPlayer: null,
  setSelectedPlayer: (player) => set({ selectedPlayer: player }),
  clearSession: () => set({ selectedPlayer: null }),
}));

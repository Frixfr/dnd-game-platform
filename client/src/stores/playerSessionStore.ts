// client/src/stores/playerSessionStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PlayerType } from "../types";
import { socket } from "../lib/socket";

interface PlayerSessionStore {
  selectedPlayer: PlayerType | null;
  setSelectedPlayer: (player: PlayerType | null) => void;
  clearSession: () => void;
  initializeSessionSocket: () => void; // добавлено
}

let sessionSocketInitialized = false;

export const usePlayerSessionStore = create<PlayerSessionStore>()(
  persist(
    (set, get) => ({
      selectedPlayer: null,
      setSelectedPlayer: (player) => set({ selectedPlayer: player }),
      clearSession: () => set({ selectedPlayer: null }),
      initializeSessionSocket: () => {
        if (sessionSocketInitialized) return;
        sessionSocketInitialized = true;

        // Обновляем данные игрока при любом изменении (мастером, боем и т.д.)
        socket.on("player:updated", (updatedPlayer: PlayerType) => {
          const current = get().selectedPlayer;
          if (current && current.id === updatedPlayer.id) {
            console.log("Обновление выбранного игрока через сокет");
            set({ selectedPlayer: updatedPlayer });
          }
        });

        // Если игрока удалили — выходим из сессии
        socket.on("player:deleted", (playerId: number) => {
          const current = get().selectedPlayer;
          if (current && current.id === playerId) {
            console.log("Выбранный игрок удалён, очищаем сессию");
            set({ selectedPlayer: null });
          }
        });
      },
    }),
    {
      name: "player-session",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

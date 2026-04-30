// client/src/stores/playerSessionStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PlayerType } from "../types";
import { socket } from "../lib/socket";

let sessionSocketHandlers: {
  onPlayerUpdated: (player: PlayerType) => void;
  onPlayerDeleted: (playerId: number) => void;
} | null = null;
let sessionSocketInitialized = false;

interface PlayerSessionStore {
  selectedPlayer: PlayerType | null;
  setSelectedPlayer: (player: PlayerType | null) => void;
  clearSession: () => void;
  initializeSessionSocket: () => void;
  disconnectSocket: () => void;
}

export const usePlayerSessionStore = create<PlayerSessionStore>()(
  persist(
    (set, get) => ({
      selectedPlayer: null,
      setSelectedPlayer: (player) => set({ selectedPlayer: player }),
      clearSession: () => set({ selectedPlayer: null }),
      initializeSessionSocket: () => {
        if (sessionSocketInitialized) return;
        sessionSocketInitialized = true;

        const onPlayerUpdated = (updatedPlayer: PlayerType) => {
          const current = get().selectedPlayer;
          if (current && current.id === updatedPlayer.id) {
            console.log("Обновление выбранного игрока через сокет");
            set({ selectedPlayer: { ...updatedPlayer } });
          }
        };
        const onPlayerDeleted = (playerId: number) => {
          const current = get().selectedPlayer;
          if (current && current.id === playerId) {
            console.log("Выбранный игрок удалён, очищаем сессию");
            set({ selectedPlayer: null });
          }
        };

        socket.on("player:updated", onPlayerUpdated);
        socket.on("player:deleted", onPlayerDeleted);

        sessionSocketHandlers = { onPlayerUpdated, onPlayerDeleted };
      },
      disconnectSocket: () => {
        if (!sessionSocketInitialized || !sessionSocketHandlers) return;
        const { onPlayerUpdated, onPlayerDeleted } = sessionSocketHandlers;
        socket.off("player:updated", onPlayerUpdated);
        socket.off("player:deleted", onPlayerDeleted);
        sessionSocketInitialized = false;
        sessionSocketHandlers = null;
        console.log("PlayerSessionStore socket handlers removed");
      },
    }),
    {
      name: "player-session",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

// client/src/stores/playerStore.ts
import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import type { PlayerType } from "../types";

interface PlayerStore {
  players: PlayerType[];
  socket: Socket | null;
  initializeSocket: () => void;
  addPlayer: (player: PlayerType) => void;
  updatePlayer: (updatedPlayer: PlayerType) => void;
  deletePlayer: (playerId: number) => void;
  setPlayers: (players: PlayerType[]) => void;
  fetchPlayers: () => Promise<void>;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  players: [],
  socket: null,

  initializeSocket: () => {
    const socket = io("http://localhost:5000", {
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    // Исправлено: событие сервера "player:created"
    socket.on("player:created", (player: PlayerType) => {
      console.log("Игрок создан (сокет):", player);
      set((state) => ({
        players: [...state.players, player],
      }));
    });

    // Исправлено: "player:updated"
    socket.on("player:updated", (player: PlayerType) => {
      console.log("Игрок обновлён (сокет):", player);
      set((state) => ({
        players: state.players.map((p) => (p.id === player.id ? player : p)),
      }));
    });

    // Исправлено: "player:deleted"
    socket.on("player:deleted", (playerId: number) => {
      console.log("Игрок удалён (сокет):", playerId);
      set((state) => ({
        players: state.players.filter((p) => p.id !== playerId),
      }));
    });

    socket.on("connect", async () => {
      console.log("Socket connected (players)");
      await get().fetchPlayers();
    });

    set({ socket });
  },

  fetchPlayers: async () => {
    try {
      const response = await fetch("http://localhost:5000/api/players");
      if (response.ok) {
        const players = await response.json();
        set({ players });
      }
    } catch (error) {
      console.error("Ошибка загрузки игроков:", error);
    }
  },

  addPlayer: (player) => {
    set((state) => ({
      players: [...state.players, player],
    }));
  },

  updatePlayer: (updatedPlayer) => {
    set((state) => ({
      players: state.players.map((player) =>
        player.id === updatedPlayer.id ? updatedPlayer : player,
      ),
    }));
  },

  deletePlayer: (playerId) => {
    set((state) => ({
      players: state.players.filter((player) => player.id !== playerId),
    }));
  },

  setPlayers: (players) => {
    set({ players });
  },
}));

// ВАЖНО: вызовите usePlayerStore.getState().initializeSocket() в вашем App.tsx или аналогичном корневом компоненте

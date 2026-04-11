// Файл: client/src/stores/playerStore.ts

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
  // updatePlayerFull больше не нужен, так как теперь все данные полные
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  players: [],
  socket: null,

  initializeSocket: () => {
    const socket = io({
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.on("player:created", (player: PlayerType) => {
      console.log("Игрок создан (сокет):", player);
      set((state) => ({
        players: [...state.players, player],
      }));
    });

    socket.on("player:updated", (player: PlayerType) => {
      console.log("Игрок обновлён (сокет):", player);
      set((state) => ({
        players: state.players.map((p) => (p.id === player.id ? player : p)),
      }));
    });

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
      // Используем новый эндпоинт для получения полных данных всех игроков за один запрос
      const response = await fetch("/api/players?full=true");
      if (response.ok) {
        const players: PlayerType[] = await response.json();
        set({ players });
      } else {
        console.error("Ошибка загрузки игроков:", response.status);
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

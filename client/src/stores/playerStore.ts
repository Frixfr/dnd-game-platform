// client/src/stores/playerStore.ts

import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import type { PlayerType } from "../types";

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface PlayerStore {
  players: PlayerType[];
  playersTotal: number;
  currentPage: number;
  limit: number;
  socket: Socket | null;
  initializeSocket: () => void;
  setPlayers: (
    players: PlayerType[],
    total: number,
    page: number,
    limit: number,
  ) => void;
  fetchPlayers: (page?: number, limit?: number) => Promise<void>;
  addPlayer: (player: PlayerType) => void;
  updatePlayer: (updatedPlayer: PlayerType) => void;
  deletePlayer: (playerId: number) => void;
  // Для случаев, когда нужны все игроки (например, для выбора в модалке)
  fetchAllPlayers: () => Promise<PlayerType[]>;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  players: [],
  playersTotal: 0,
  currentPage: 1,
  limit: 20,
  socket: null,

  initializeSocket: () => {
    const socket = io({
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.on("player:created", async (player: PlayerType) => {
      console.log("Игрок создан (сокет):", player);
      // Перезагружаем текущую страницу
      const { currentPage, limit, fetchPlayers } = get();
      await fetchPlayers(currentPage, limit);
    });

    socket.on("player:updated", async (player: PlayerType) => {
      console.log("Игрок обновлён (сокет):", player);
      const { currentPage, limit, fetchPlayers } = get();
      await fetchPlayers(currentPage, limit);
    });

    socket.on("player:deleted", async (playerId: number) => {
      console.log("Игрок удалён (сокет):", playerId);
      const { currentPage, limit, fetchPlayers } = get();
      await fetchPlayers(currentPage, limit);
    });

    socket.on("connect", async () => {
      console.log("Socket connected (players)");
      const { currentPage, limit, fetchPlayers } = get();
      await fetchPlayers(currentPage, limit);
    });

    set({ socket });
  },

  fetchPlayers: async (page = 1, limit = 20) => {
    try {
      const response = await fetch(`/api/players?page=${page}&limit=${limit}`);
      if (response.ok) {
        const result: PaginatedResponse<PlayerType> = await response.json();
        set({
          players: result.data,
          playersTotal: result.total,
          currentPage: result.page,
          limit: result.limit,
        });
      } else {
        console.error("Ошибка загрузки игроков:", response.status);
      }
    } catch (error) {
      console.error("Ошибка загрузки игроков:", error);
    }
  },

  fetchAllPlayers: async () => {
    try {
      // Используем эндпоинт без пагинации (либо с большим лимитом)
      const response = await fetch("/api/players?limit=9999");
      if (response.ok) {
        const result = await response.json();
        // Если сервер вернул пагинированный ответ, извлекаем data, иначе массив
        const players = Array.isArray(result) ? result : result.data;
        return players;
      }
      return [];
    } catch (error) {
      console.error("Ошибка загрузки всех игроков:", error);
      return [];
    }
  },

  addPlayer: (player) => {
    set((state) => ({
      players: [...state.players, player],
    }));
  },

  updatePlayer: (updatedPlayer) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === updatedPlayer.id ? updatedPlayer : p,
      ),
    }));
  },

  deletePlayer: (playerId) => {
    set((state) => ({
      players: state.players.filter((p) => p.id !== playerId),
    }));
  },

  setPlayers: (players, total, page, limit) => {
    set({ players, playersTotal: total, currentPage: page, limit });
  },
}));

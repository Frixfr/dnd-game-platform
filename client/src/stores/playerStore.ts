// client/src/stores/playerStore.ts
import { create } from "zustand";
import type { PlayerType } from "../types";
import { socket } from "../lib/socket";

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
  fetchAllPlayers: () => Promise<PlayerType[]>;
  // Переименованные методы
  executeUseItem: (playerId: number, playerItemId: number) => Promise<void>;
  executeDiscardItem: (playerId: number, playerItemId: number) => Promise<void>;
  executeTransferItem: (
    playerId: number,
    playerItemId: number,
    targetPlayerId: number,
    quantity?: number,
  ) => Promise<void>;
}

let playerSocketInitialized = false;

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  players: [],
  playersTotal: 0,
  currentPage: 1,
  limit: 20,

  initializeSocket: () => {
    if (playerSocketInitialized) return;
    playerSocketInitialized = true;

    socket.on("player:created", async () => {
      console.log("Игрок создан (сокет)");
      const { currentPage, limit, fetchPlayers } = get();
      await fetchPlayers(currentPage, limit);
    });

    socket.on("player:updated", async () => {
      console.log("Игрок обновлён (сокет)");
      const { currentPage, limit, fetchPlayers } = get();
      await fetchPlayers(currentPage, limit);
    });

    socket.on("player:deleted", async () => {
      console.log("Игрок удалён (сокет)");
      const { currentPage, limit, fetchPlayers } = get();
      await fetchPlayers(currentPage, limit);
    });

    socket.on("connect", async () => {
      console.log("Socket connected (players)");
      const { currentPage, limit, fetchPlayers } = get();
      await fetchPlayers(currentPage, limit);
    });
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
      const response = await fetch("/api/players?limit=9999");
      if (response.ok) {
        const result = await response.json();
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

  executeUseItem: async (playerId: number, playerItemId: number) => {
    const response = await fetch(
      `/api/player-items/${playerId}/items/${playerItemId}/use`,
      { method: "POST" },
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }
  },

  executeDiscardItem: async (playerId: number, playerItemId: number) => {
    const response = await fetch(
      `/api/player-items/${playerId}/items/${playerItemId}/discard`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }
  },

  executeTransferItem: async (
    playerId: number,
    playerItemId: number,
    targetPlayerId: number,
    quantity: number = 1,
  ) => {
    const response = await fetch(
      `/api/player-items/${playerId}/items/${playerItemId}/transfer`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPlayerId, quantity }),
      },
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }
  },
}));

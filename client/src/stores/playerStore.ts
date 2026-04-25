// client/src/stores/playerStore.ts
import { create } from "zustand";
import type { PlayerType } from "../types";
import { socket } from "../lib/socket";
import { socket as globalSocket } from "../lib/socket";

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
  socket: typeof globalSocket;
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
  executeUseItem: (playerId: number, playerItemId: number) => Promise<void>;
  executeUseAbility: (playerId: number, abilityId: number) => Promise<void>;
  updatePlayerNotes: (playerId: number, notes: string) => Promise<void>;
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
  socket: globalSocket,

  initializeSocket: () => {
    if (playerSocketInitialized) return;
    playerSocketInitialized = true;

    socket.on("player:created", (newPlayer: PlayerType) => {
      console.log("Игрок создан (сокет)");
      set((state) => {
        // Если мы на первой странице и есть место, добавляем в начало
        if (state.currentPage === 1 && state.players.length < state.limit) {
          return {
            players: [newPlayer, ...state.players],
            playersTotal: state.playersTotal + 1,
          };
        } else {
          return { playersTotal: state.playersTotal + 1 };
        }
      });
    });

    socket.on("player:updated", (updatedPlayer: PlayerType) => {
      console.log("Игрок обновлён (сокет)");
      set((state) => ({
        players: state.players.map((p) =>
          p.id === updatedPlayer.id ? updatedPlayer : p,
        ),
      }));
    });

    socket.on("player:deleted", (playerId: number) => {
      console.log("Игрок удалён (сокет)");
      set((state) => ({
        players: state.players.filter((p) => p.id !== playerId),
        playersTotal: state.playersTotal - 1,
      }));
    });

    socket.on("connect", async () => {
      console.log("Socket connected (players)");
      const { currentPage, limit, fetchPlayers } = get();
      await fetchPlayers(currentPage, limit);
    });
  },

  fetchPlayers: async (page = 1, limit = 20) => {
    try {
      // Добавляем параметр full=true для получения final_stats
      const response = await fetch(
        `/api/players?full=true&page=${page}&limit=${limit}`,
      );
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
      // Для списка всех игроков тоже лучше использовать full=true
      const response = await fetch("/api/players?full=true&limit=9999");
      if (response.ok) {
        const result = await response.json();
        // Ответ с пагинацией: { data, total, page, limit }
        const players = result.data || result;
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

  executeUseAbility: async (playerId: number, abilityId: number) => {
    const response = await fetch(
      `/api/players/${playerId}/abilities/${abilityId}/use`,
      {
        method: "POST",
      },
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

  updatePlayerNotes: async (playerId: number, notes: string) => {
    const response = await fetch(`/api/players/${playerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notes.trim() || null }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }
    const result = await response.json();
    if (result.player) {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId ? result.player : p,
        ),
      }));
    }
  },
}));

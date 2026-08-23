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

// Хранилище для обработчиков сокетов (чтобы потом отключить)
let playerSocketHandlers: {
  onConnect: () => void;
  onCreated: (player: PlayerType) => void;
  onUpdated: (player: PlayerType) => void;
  onDeleted: (playerId: number) => void;
} | null = null;
let playerSocketInitialized = false;

interface PlayerStore {
  players: PlayerType[];
  playersTotal: number;
  currentPage: number;
  limit: number;
  roomId: number | null;
  socket: typeof socket;
  initializeSocket: () => void;
  disconnectSocket: () => void;
  setRoomId: (roomId: number | null) => void;
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
  executeDiscardItem: (
    playerId: number,
    playerItemId: number,
    quantity?: number,
  ) => Promise<void>;
  executeTransferItem: (
    playerId: number,
    playerItemId: number,
    targetPlayerId: number,
    quantity?: number,
  ) => Promise<void>;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  players: [],
  playersTotal: 0,
  currentPage: 1,
  limit: 20,
  roomId: null,
  socket,

  initializeSocket: () => {
    if (playerSocketInitialized) return;
    playerSocketInitialized = true;

    const onConnect = async () => {
      console.log("✅ [playerStore] Socket connected");
      const { currentPage, limit, fetchPlayers } = get();
      await fetchPlayers(currentPage, limit);
    };

    const onCreated = (newPlayer: PlayerType) => {
      console.log("📢 [playerStore] player:created", newPlayer.id);
      set((state) => {
        if (state.currentPage === 1 && state.players.length < state.limit) {
          return {
            players: [newPlayer, ...state.players],
            playersTotal: state.playersTotal + 1,
          };
        } else {
          return { playersTotal: state.playersTotal + 1 };
        }
      });
    };

    const onUpdated = (updatedPlayer: PlayerType) => {
      console.log("🔄 [playerStore] player:updated", updatedPlayer.id);
      set((state) => {
        const index = state.players.findIndex((p) => p.id === updatedPlayer.id);
        if (index === -1) return {};
        const newPlayers = [...state.players];
        newPlayers[index] = updatedPlayer;
        return { players: newPlayers };
      });
    };

    const onDeleted = (playerId: number) => {
      console.log("🗑️ [playerStore] player:deleted", playerId);
      set((state) => ({
        players: state.players.filter((p) => p.id !== playerId),
        playersTotal: state.playersTotal - 1,
      }));
    };

    socket.on("connect", onConnect);
    socket.on("player:created", onCreated);
    socket.on("player:updated", onUpdated);
    socket.on("player:deleted", onDeleted);

    playerSocketHandlers = { onConnect, onCreated, onUpdated, onDeleted };

    // Отправляем join-room с текущим roomId
    const roomId = get().roomId;
    if (roomId !== null && roomId !== undefined) {
      socket.emit("join-room", { roomId });
    }
  },

  disconnectSocket: () => {
    if (!playerSocketInitialized || !playerSocketHandlers) return;
    const { onConnect, onCreated, onUpdated, onDeleted } = playerSocketHandlers;
    socket.off("connect", onConnect);
    socket.off("player:created", onCreated);
    socket.off("player:updated", onUpdated);
    socket.off("player:deleted", onDeleted);
    playerSocketInitialized = false;
    playerSocketHandlers = null;
    console.log("PlayerStore socket handlers removed");
  },

  setRoomId: (roomId) => {
    set({ roomId });
    if (socket.connected) {
      socket.emit("join-room", { roomId });
    }
  },

  fetchPlayers: async (page = 1, limit = 20) => {
    try {
      console.log("📡 Загрузка игроков, страница", page);
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
      const response = await fetch("/api/players?full=true&limit=9999");
      if (response.ok) {
        const result = await response.json();
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
      { method: "POST" },
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }
  },

  executeDiscardItem: async (
    playerId: number,
    playerItemId: number,
    quantity?: number,
  ) => {
    const response = await fetch(
      `/api/player-items/${playerId}/items/${playerItemId}/discard`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      },
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

// client/src/stores/npcStore.ts

import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import type { NpcType } from "../types";

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface NpcStore {
  npcs: NpcType[];
  npcsTotal: number;
  currentPage: number;
  limit: number;
  socket: Socket | null;
  initializeSocket: () => void;
  fetchNpcs: (page?: number, limit?: number) => Promise<void>;
  fetchAllNpcs: () => Promise<NpcType[]>;
  addNpc: (npc: NpcType) => void;
  updateNpc: (updatedNpc: NpcType) => void;
  deleteNpc: (npcId: number) => void;
  setNpcs: (
    npcs: NpcType[],
    total: number,
    page: number,
    limit: number,
  ) => void;
}

export const useNpcStore = create<NpcStore>((set, get) => ({
  npcs: [],
  npcsTotal: 0,
  currentPage: 1,
  limit: 20,
  socket: null,

  initializeSocket: () => {
    const { socket } = get();
    if (socket && socket.connected) return;

    const newSocket = io({
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
    });

    newSocket.on("npc:created", async () => {
      console.log("NPC создан (сокет)");
      const { currentPage, limit, fetchNpcs } = get();
      await fetchNpcs(currentPage, limit);
    });
    newSocket.on("npc:updated", async () => {
      console.log("NPC обновлён (сокет)");
      const { currentPage, limit, fetchNpcs } = get();
      await fetchNpcs(currentPage, limit);
    });
    newSocket.on("npc:deleted", async () => {
      console.log("NPC удалён (сокет)");
      const { currentPage, limit, fetchNpcs } = get();
      await fetchNpcs(currentPage, limit);
    });

    newSocket.on("connect", async () => {
      console.log("Socket connected (npcs)");
      const { currentPage, limit, fetchNpcs } = get();
      await fetchNpcs(currentPage, limit);
    });

    set({ socket: newSocket });
  },

  fetchNpcs: async (page = 1, limit = 20) => {
    try {
      const response = await fetch(`/api/npcs?page=${page}&limit=${limit}`);
      if (response.ok) {
        const result: PaginatedResponse<NpcType> = await response.json();
        set({
          npcs: result.data,
          npcsTotal: result.total,
          currentPage: result.page,
          limit: result.limit,
        });
      } else {
        console.error("Ошибка загрузки NPC:", response.status);
      }
    } catch (error) {
      console.error("Ошибка загрузки NPC:", error);
    }
  },

  fetchAllNpcs: async () => {
    try {
      const response = await fetch("/api/npcs?limit=9999");
      if (response.ok) {
        const result = await response.json();
        return Array.isArray(result) ? result : result.data;
      }
      return [];
    } catch (error) {
      console.error("Ошибка загрузки всех NPC:", error);
      return [];
    }
  },

  addNpc: (npc) => set((state) => ({ npcs: [...state.npcs, npc] })),
  updateNpc: (updatedNpc) =>
    set((state) => ({
      npcs: state.npcs.map((n) => (n.id === updatedNpc.id ? updatedNpc : n)),
    })),
  deleteNpc: (npcId) =>
    set((state) => ({ npcs: state.npcs.filter((n) => n.id !== npcId) })),
  setNpcs: (npcs, total, page, limit) =>
    set({ npcs, npcsTotal: total, currentPage: page, limit }),
}));

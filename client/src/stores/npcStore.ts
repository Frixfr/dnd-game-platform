// client/src/stores/npcStore.ts
import { create } from "zustand";
import type { NpcType } from "../types";
import { socket } from "../lib/socket";

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

let npcSocketHandlers: {
  onConnect: () => void;
  onCreated: (npc: NpcType) => void;
  onUpdated: (npc: NpcType) => void;
  onDeleted: (npcId: number) => void;
} | null = null;
let npcSocketInitialized = false;

interface NpcStore {
  npcs: NpcType[];
  npcsTotal: number;
  currentPage: number;
  limit: number;
  initializeSocket: () => void;
  disconnectSocket: () => void;
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

  initializeSocket: () => {
    if (npcSocketInitialized) return;
    npcSocketInitialized = true;

    const onConnect = async () => {
      const { currentPage, limit, fetchNpcs } = get();
      await fetchNpcs(currentPage, limit);
    };
    const onCreated = (npc: NpcType) => {
      console.log("NPC создан (сокет)");
      set((state) => {
        if (state.currentPage === 1 && state.npcs.length < state.limit) {
          return { npcs: [npc, ...state.npcs], npcsTotal: state.npcsTotal + 1 };
        } else {
          return { npcsTotal: state.npcsTotal + 1 };
        }
      });
    };
    const onUpdated = (updated: NpcType) => {
      console.log("NPC обновлён (сокет)");
      set((state) => ({
        npcs: state.npcs.map((n) => (n.id === updated.id ? updated : n)),
      }));
    };
    const onDeleted = (npcId: number) => {
      console.log("NPC удалён (сокет)");
      set((state) => ({
        npcs: state.npcs.filter((n) => n.id !== npcId),
        npcsTotal: state.npcsTotal - 1,
      }));
    };

    socket.on("connect", onConnect);
    socket.on("npc:created", onCreated);
    socket.on("npc:updated", onUpdated);
    socket.on("npc:deleted", onDeleted);

    npcSocketHandlers = { onConnect, onCreated, onUpdated, onDeleted };
  },

  disconnectSocket: () => {
    if (!npcSocketInitialized || !npcSocketHandlers) return;
    const { onConnect, onCreated, onUpdated, onDeleted } = npcSocketHandlers;
    socket.off("connect", onConnect);
    socket.off("npc:created", onCreated);
    socket.off("npc:updated", onUpdated);
    socket.off("npc:deleted", onDeleted);
    npcSocketInitialized = false;
    npcSocketHandlers = null;
    console.log("NpcStore socket handlers removed");
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

import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import type { NpcType } from "../types";

interface NpcStore {
  npcs: NpcType[];
  socket: Socket | null;
  initializeSocket: () => void;
  addNpc: (npc: NpcType) => void;
  updateNpc: (updatedNpc: NpcType) => void;
  deleteNpc: (npcId: number) => void;
  setNpcs: (npcs: NpcType[]) => void;
  fetchNpcs: () => Promise<void>;
}

export const useNpcStore = create<NpcStore>((set, get) => ({
  npcs: [],
  socket: null,

  initializeSocket: () => {
    const { socket } = get();
    // Если сокет уже существует и подключён — не создаём новый
    if (socket && socket.connected) return;

    const newSocket = io({
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
    });

    newSocket.on("npc:created", (npc: NpcType) => {
      console.log("NPC создан:", npc);
      set((state) => ({ npcs: [...state.npcs, npc] }));
    });
    newSocket.on("npc:updated", (npc: NpcType) => {
      set((state) => ({
        npcs: state.npcs.map((p) => (p.id === npc.id ? npc : p)),
      }));
    });
    newSocket.on("npc:deleted", (npcId: number) => {
      set((state) => ({ npcs: state.npcs.filter((p) => p.id !== npcId) }));
    });
    // Не вызываем fetchNpcs здесь, чтобы избежать двойной загрузки
    // (fetchNpcs будет вызван в useEffect на странице)
    set({ socket: newSocket });
  },

  fetchNpcs: async () => {
    try {
      const response = await fetch("/api/npcs");
      if (response.ok) {
        const npcs = await response.json();
        set({ npcs });
      }
    } catch (error) {
      console.error("Ошибка загрузки NPC:", error);
    }
  },

  addNpc: (npc) => set((state) => ({ npcs: [...state.npcs, npc] })),
  updateNpc: (updatedNpc) =>
    set((state) => ({
      npcs: state.npcs.map((n) => (n.id === updatedNpc.id ? updatedNpc : n)),
    })),
  deleteNpc: (npcId) =>
    set((state) => ({ npcs: state.npcs.filter((n) => n.id !== npcId) })),
  setNpcs: (npcs) => set({ npcs }),
}));

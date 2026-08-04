// client/src/stores/effectStore.ts
import { create } from "zustand";
import type { EffectType } from "../types";
import { socket } from "../lib/socket";

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

let effectSocketHandlers: {
  onConnect: () => void;
  onCreated: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
} | null = null;
let effectSocketInitialized = false;

interface EffectState {
  effects: EffectType[];
  effectsTotal: number;
  currentPage: number;
  limit: number;
  roomId: number | null;
  addEffect: (effect: EffectType) => void;
  setEffects: (
    effects: EffectType[],
    total: number,
    page: number,
    limit: number,
  ) => void;
  initializeSocket: () => void;
  disconnectSocket: () => void;
  setRoomId: (roomId: number | null) => void;
  fetchEffects: (page?: number, limit?: number) => Promise<void>;
  fetchAllEffects: () => Promise<EffectType[]>;
  updateEffect: (effect: EffectType) => void;
  removeEffect: (id: number) => void;
}

export const useEffectStore = create<EffectState>((set, get) => ({
  effects: [],
  effectsTotal: 0,
  currentPage: 1,
  limit: 20,
  roomId: null,

  initializeSocket: () => {
    if (effectSocketInitialized) return;
    effectSocketInitialized = true;

    const onConnect = async () => {
      const { currentPage, limit, fetchEffects } = get();
      await fetchEffects(currentPage, limit);
    };
    const onCreated = async () => {
      const { currentPage, limit, fetchEffects } = get();
      await fetchEffects(currentPage, limit);
    };
    const onUpdated = async () => {
      const { currentPage, limit, fetchEffects } = get();
      await fetchEffects(currentPage, limit);
    };
    const onDeleted = async () => {
      const { currentPage, limit, fetchEffects } = get();
      await fetchEffects(currentPage, limit);
    };

    socket.on("connect", onConnect);
    socket.on("effect:created", onCreated);
    socket.on("effect:updated", onUpdated);
    socket.on("effect:deleted", onDeleted);

    effectSocketHandlers = { onConnect, onCreated, onUpdated, onDeleted };

    const roomId = get().roomId;
    if (roomId !== null && roomId !== undefined) {
      socket.emit("join-room", { roomId });
    }
  },

  disconnectSocket: () => {
    if (!effectSocketInitialized || !effectSocketHandlers) return;
    const { onConnect, onCreated, onUpdated, onDeleted } = effectSocketHandlers;
    socket.off("connect", onConnect);
    socket.off("effect:created", onCreated);
    socket.off("effect:updated", onUpdated);
    socket.off("effect:deleted", onDeleted);
    effectSocketInitialized = false;
    effectSocketHandlers = null;
    console.log("EffectStore socket handlers removed");
  },

  setRoomId: (roomId) => {
    set({ roomId });
    if (socket.connected) {
      socket.emit("join-room", { roomId });
    }
  },

  fetchEffects: async (page = 1, limit = 20) => {
    try {
      const response = await fetch(`/api/effects?page=${page}&limit=${limit}`);
      if (response.ok) {
        const result: PaginatedResponse<EffectType> = await response.json();
        set({
          effects: result.data,
          effectsTotal: result.total,
          currentPage: result.page,
          limit: result.limit,
        });
      }
    } catch (error) {
      console.error("Ошибка загрузки эффектов:", error);
    }
  },

  fetchAllEffects: async () => {
    try {
      const response = await fetch("/api/effects?limit=9999");
      if (response.ok) {
        const result = await response.json();
        return Array.isArray(result) ? result : result.data;
      }
      return [];
    } catch (error) {
      console.error("Ошибка загрузки всех эффектов:", error);
      return [];
    }
  },

  addEffect: (effect) =>
    set((state) => {
      if (state.effects.some((e) => e.id === effect.id)) return state;
      return { effects: [...state.effects, effect] };
    }),

  setEffects: (effects, total, page, limit) =>
    set({ effects, effectsTotal: total, currentPage: page, limit }),

  updateEffect: (effect) =>
    set((state) => ({
      effects: state.effects.map((e) => (e.id === effect.id ? effect : e)),
    })),

  removeEffect: (id) =>
    set((state) => ({
      effects: state.effects.filter((e) => e.id !== id),
    })),
}));

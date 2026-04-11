// client/src/stores/effectStore.ts
import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import type { EffectType } from "../types";

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface EffectState {
  effects: EffectType[];
  effectsTotal: number;
  currentPage: number;
  limit: number;
  socket: Socket | null;
  addEffect: (effect: EffectType) => void;
  setEffects: (
    effects: EffectType[],
    total: number,
    page: number,
    limit: number,
  ) => void;
  initializeSocket: () => void;
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
  socket: null,

  initializeSocket: () => {
    if (get().socket?.connected) return;
    if (typeof window === "undefined") return;

    const socket = io({
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.on("effect:created", async () => {
      console.log("Эффект создан (сокет)");
      const { currentPage, limit, fetchEffects } = get();
      await fetchEffects(currentPage, limit);
    });

    socket.on("effect:updated", async () => {
      console.log("Эффект обновлён (сокет)");
      const { currentPage, limit, fetchEffects } = get();
      await fetchEffects(currentPage, limit);
    });

    socket.on("effect:deleted", async () => {
      console.log("Эффект удалён (сокет)");
      const { currentPage, limit, fetchEffects } = get();
      await fetchEffects(currentPage, limit);
    });

    socket.on("connect", async () => {
      console.log("Socket connected (effects)");
      const { currentPage, limit, fetchEffects } = get();
      await fetchEffects(currentPage, limit);
    });

    set({ socket });
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

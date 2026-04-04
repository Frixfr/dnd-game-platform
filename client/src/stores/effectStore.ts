// client/src/stores/effectStore.ts
import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import type { EffectType } from "../types";

interface EffectState {
  effects: EffectType[];
  socket: Socket | null;
  addEffect: (effect: EffectType) => void;
  setEffects: (effects: EffectType[]) => void;
  initializeSocket: () => void;
  fetchEffects: () => Promise<void>;
  updateEffect: (effect: EffectType) => void;
  removeEffect: (id: number) => void;
}

export const useEffectStore = create<EffectState>((set, get) => ({
  effects: [],
  socket: null,

  initializeSocket: () => {
    if (typeof window === "undefined") return;

    const socket = io("http://localhost:5000", {
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    // Исправлено: событие "effect:created"
    socket.on("effect:created", (effect: EffectType) => {
      console.log("Эффект создан (сокет):", effect);
      set((state) => ({
        effects: [...state.effects, effect],
      }));
    });

    // Добавлено: обработка обновления эффекта
    socket.on("effect:updated", (updatedEffect: EffectType) => {
      console.log("Эффект обновлён (сокет):", updatedEffect);
      set((state) => ({
        effects: state.effects.map((e) =>
          e.id === updatedEffect.id ? updatedEffect : e,
        ),
      }));
    });

    // Добавлено: обработка удаления эффекта
    socket.on("effect:deleted", ({ id }: { id: number }) => {
      console.log("Эффект удалён (сокет):", id);
      set((state) => ({
        effects: state.effects.filter((e) => e.id !== id),
      }));
    });

    socket.on("connect", async () => {
      console.log("Socket connected (effects)");
      await get().fetchEffects();
    });

    set({ socket });
  },

  addEffect: (effect) =>
    set((state) => ({
      effects: [...state.effects, effect],
    })),

  setEffects: (effects) => set({ effects }),

  updateEffect: (effect) =>
    set((state) => ({
      effects: state.effects.map((e) => (e.id === effect.id ? effect : e)),
    })),

  removeEffect: (id) =>
    set((state) => ({
      effects: state.effects.filter((e) => e.id !== id),
    })),

  fetchEffects: async () => {
    try {
      const response = await fetch("http://localhost:5000/api/effects");
      if (response.ok) {
        const effects = await response.json();
        set({ effects });
      }
    } catch (error) {
      console.error("Ошибка загрузки эффектов:", error);
    }
  },
}));

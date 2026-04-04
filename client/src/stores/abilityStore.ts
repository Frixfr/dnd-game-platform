import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import type { AbilityType } from "../types";

interface AbilityStore {
  abilities: AbilityType[];
  socket: Socket | null;
  addAbility: (ability: AbilityType) => void;
  setAbilities: (abilities: AbilityType[]) => void;
  updateAbility: (updatedAbility: AbilityType) => void;
  removeAbility: (abilityId: number) => void;
  initializeSocket: () => void;
  fetchAbilities: () => Promise<void>;
}

export const useAbilityStore = create<AbilityStore>((set, get) => ({
  abilities: [],
  socket: null,

  addAbility: (ability) =>
    set((state) => {
      // Проверка на дублирование
      if (state.abilities.some((a) => a.id === ability.id)) {
        return state;
      }
      return { abilities: [ability, ...state.abilities] };
    }),

  setAbilities: (abilities) => set({ abilities }),

  updateAbility: (updatedAbility) =>
    set((state) => ({
      abilities: state.abilities.map((a) =>
        a.id === updatedAbility.id ? updatedAbility : a,
      ),
    })),

  removeAbility: (abilityId) =>
    set((state) => ({
      abilities: state.abilities.filter((a) => a.id !== abilityId),
    })),

  initializeSocket: () => {
    if (typeof window === "undefined") return;
    if (get().socket) return; // предотвращаем повторную инициализацию

    const socket = io("http://localhost:5000", {
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.on("ability:created", (ability: AbilityType) => {
      console.log("Новая способность создана через сокет:", ability);
      get().addAbility(ability);
    });

    socket.on("ability:updated", (ability: AbilityType) => {
      console.log("Способность обновлена через сокет:", ability);
      get().updateAbility(ability);
    });

    socket.on("ability:deleted", ({ id }: { id: number }) => {
      console.log("Способность удалена через сокет:", id);
      get().removeAbility(id);
    });

    // Убираем fetchAbilities из connect — загрузка происходит только при монтировании страницы
    set({ socket });
  },

  fetchAbilities: async () => {
    try {
      const response = await fetch("http://localhost:5000/api/abilities");
      if (response.ok) {
        const abilities = await response.json();
        set({ abilities });
        console.log("Способности загружены:", abilities.length);
      }
    } catch (error) {
      console.error("Ошибка загрузки способностей:", error);
    }
  },
}));

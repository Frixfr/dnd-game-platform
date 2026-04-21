// client/src/stores/abilityStore.ts
import { create } from "zustand";
import type { AbilityType } from "../types";
import { socket } from "../lib/socket";

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface AbilityStore {
  abilities: AbilityType[];
  abilitiesTotal: number;
  currentPage: number;
  limit: number;
  addAbility: (ability: AbilityType) => void;
  setAbilities: (
    abilities: AbilityType[],
    total: number,
    page: number,
    limit: number,
  ) => void;
  updateAbility: (updatedAbility: AbilityType) => void;
  removeAbility: (abilityId: number) => void;
  initializeSocket: () => void;
  fetchAbilities: (page?: number, limit?: number) => Promise<void>;
  fetchAllAbilities: () => Promise<AbilityType[]>;
}

let abilitySocketInitialized = false;

export const useAbilityStore = create<AbilityStore>((set, get) => ({
  abilities: [],
  abilitiesTotal: 0,
  currentPage: 1,
  limit: 20,

  addAbility: (ability) =>
    set((state) => {
      if (state.abilities.some((a) => a.id === ability.id)) return state;
      return { abilities: [ability, ...state.abilities] };
    }),

  setAbilities: (abilities, total, page, limit) =>
    set({ abilities, abilitiesTotal: total, currentPage: page, limit }),

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
    if (abilitySocketInitialized) return;
    abilitySocketInitialized = true;

    socket.on("ability:created", async () => {
      console.log("Способность создана (сокет)");
      const { currentPage, limit, fetchAbilities } = get();
      await fetchAbilities(currentPage, limit);
    });

    socket.on("ability:updated", async () => {
      console.log("Способность обновлена (сокет)");
      const { currentPage, limit, fetchAbilities } = get();
      await fetchAbilities(currentPage, limit);
    });

    socket.on("ability:deleted", async () => {
      console.log("Способность удалена (сокет)");
      const { currentPage, limit, fetchAbilities } = get();
      await fetchAbilities(currentPage, limit);
    });

    socket.on("connect", async () => {
      console.log("Socket connected (abilities)");
      const { currentPage, limit, fetchAbilities } = get();
      await fetchAbilities(currentPage, limit);
    });
  },

  fetchAbilities: async (page = 1, limit = 20) => {
    try {
      const response = await fetch(
        `/api/abilities?page=${page}&limit=${limit}`,
      );
      if (response.ok) {
        const result: PaginatedResponse<AbilityType> = await response.json();
        set({
          abilities: result.data,
          abilitiesTotal: result.total,
          currentPage: result.page,
          limit: result.limit,
        });
      }
    } catch (error) {
      console.error("Ошибка загрузки способностей:", error);
    }
  },

  fetchAllAbilities: async () => {
    try {
      const response = await fetch("/api/abilities?limit=9999");
      if (response.ok) {
        const result = await response.json();
        return Array.isArray(result) ? result : result.data;
      }
      return [];
    } catch (error) {
      console.error("Ошибка загрузки всех способностей:", error);
      return [];
    }
  },
}));

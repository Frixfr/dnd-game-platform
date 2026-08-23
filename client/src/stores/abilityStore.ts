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

let abilitySocketHandlers: {
  onConnect: () => void;
  onCreated: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
} | null = null;
let abilitySocketInitialized = false;

interface AbilityStore {
  abilities: AbilityType[];
  abilitiesTotal: number;
  currentPage: number;
  limit: number;
  roomId: number | null;
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
  disconnectSocket: () => void;
  setRoomId: (roomId: number | null) => void;
  fetchAbilities: (page?: number, limit?: number) => Promise<void>;
  fetchAllAbilities: () => Promise<AbilityType[]>;
}

export const useAbilityStore = create<AbilityStore>((set, get) => ({
  abilities: [],
  abilitiesTotal: 0,
  currentPage: 1,
  limit: 20,
  roomId: null,

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

    const onConnect = async () => {
      const { currentPage, limit, fetchAbilities } = get();
      await fetchAbilities(currentPage, limit);
    };
    const onCreated = async () => {
      const { currentPage, limit, fetchAbilities } = get();
      await fetchAbilities(currentPage, limit);
    };
    const onUpdated = async () => {
      const { currentPage, limit, fetchAbilities } = get();
      await fetchAbilities(currentPage, limit);
    };
    const onDeleted = async () => {
      const { currentPage, limit, fetchAbilities } = get();
      await fetchAbilities(currentPage, limit);
    };

    socket.on("connect", onConnect);
    socket.on("ability:created", onCreated);
    socket.on("ability:updated", onUpdated);
    socket.on("ability:deleted", onDeleted);

    abilitySocketHandlers = { onConnect, onCreated, onUpdated, onDeleted };

    const roomId = get().roomId;
    if (roomId !== null && roomId !== undefined) {
      socket.emit("join-room", { roomId });
    }
  },

  disconnectSocket: () => {
    if (!abilitySocketInitialized || !abilitySocketHandlers) return;
    const { onConnect, onCreated, onUpdated, onDeleted } =
      abilitySocketHandlers;
    socket.off("connect", onConnect);
    socket.off("ability:created", onCreated);
    socket.off("ability:updated", onUpdated);
    socket.off("ability:deleted", onDeleted);
    abilitySocketInitialized = false;
    abilitySocketHandlers = null;
    console.log("AbilityStore socket handlers removed");
  },

  setRoomId: (roomId) => {
    set({ roomId });
    if (socket.connected) {
      socket.emit("join-room", { roomId });
    }
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

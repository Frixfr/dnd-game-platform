// client/src/stores/raceStore.ts
import { create } from "zustand";
import type { RaceType } from "../types";
import { socket } from "../lib/socket";

let raceSocketHandlers: {
  onConnect: () => void;
  onCreated: (race: RaceType) => void;
  onUpdated: (race: RaceType) => void;
  onDeleted: (data: { id: number }) => void;
} | null = null;
let raceSocketInitialized = false;

interface RaceState {
  races: RaceType[];
  setRaces: (races: RaceType[]) => void;
  initializeSocket: () => void;
  disconnectSocket: () => void;
  fetchRaces: () => Promise<void>;
  addRace: (race: RaceType) => void;
  updateRace: (race: RaceType) => void;
  removeRace: (id: number) => void;
}

export const useRaceStore = create<RaceState>((set, get) => ({
  races: [],

  initializeSocket: () => {
    if (raceSocketInitialized) return;
    raceSocketInitialized = true;

    const onConnect = async () => {
      await get().fetchRaces();
    };
    const onCreated = (race: RaceType) => {
      set((state) => {
        if (state.races.some((r) => r.id === race.id)) return state;
        return { races: [...state.races, race] };
      });
    };
    const onUpdated = (updated: RaceType) => {
      set((state) => ({
        races: state.races.map((r) => (r.id === updated.id ? updated : r)),
      }));
    };
    const onDeleted = ({ id }: { id: number }) => {
      set((state) => ({
        races: state.races.filter((r) => r.id !== id),
      }));
    };

    socket.on("connect", onConnect);
    socket.on("race:created", onCreated);
    socket.on("race:updated", onUpdated);
    socket.on("race:deleted", onDeleted);

    raceSocketHandlers = { onConnect, onCreated, onUpdated, onDeleted };
  },

  disconnectSocket: () => {
    if (!raceSocketInitialized || !raceSocketHandlers) return;
    const { onConnect, onCreated, onUpdated, onDeleted } = raceSocketHandlers;
    socket.off("connect", onConnect);
    socket.off("race:created", onCreated);
    socket.off("race:updated", onUpdated);
    socket.off("race:deleted", onDeleted);
    raceSocketInitialized = false;
    raceSocketHandlers = null;
    console.log("RaceStore socket handlers removed");
  },

  fetchRaces: async () => {
    try {
      const response = await fetch("/api/races");
      if (response.ok) {
        const races = await response.json();
        set({ races });
      }
    } catch (error) {
      console.error("Ошибка загрузки рас:", error);
    }
  },

  setRaces: (races) => set({ races }),
  addRace: (race) => set((state) => ({ races: [...state.races, race] })),
  updateRace: (race) =>
    set((state) => ({
      races: state.races.map((r) => (r.id === race.id ? race : r)),
    })),
  removeRace: (id) =>
    set((state) => ({ races: state.races.filter((r) => r.id !== id) })),
}));

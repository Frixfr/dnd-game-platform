// client/src/stores/raceStore.ts
import { create } from "zustand";
import type { RaceType } from "../types";
import { socket } from "../lib/socket";

interface RaceState {
  races: RaceType[];
  setRaces: (races: RaceType[]) => void;
  initializeSocket: () => void;
  fetchRaces: () => Promise<void>;
  addRace: (race: RaceType) => void;
  updateRace: (race: RaceType) => void;
  removeRace: (id: number) => void;
}

let raceSocketInitialized = false;

export const useRaceStore = create<RaceState>((set, get) => ({
  races: [],

  initializeSocket: () => {
    if (raceSocketInitialized) return;
    raceSocketInitialized = true;

    socket.on("race:created", (race: RaceType) => {
      set((state) => {
        if (state.races.some((r) => r.id === race.id)) return state;
        return { races: [...state.races, race] };
      });
    });
    socket.on("race:updated", (updated: RaceType) => {
      set((state) => ({
        races: state.races.map((r) => (r.id === updated.id ? updated : r)),
      }));
    });
    socket.on("race:deleted", ({ id }: { id: number }) => {
      set((state) => ({
        races: state.races.filter((r) => r.id !== id),
      }));
    });
    socket.on("connect", async () => {
      await get().fetchRaces();
    });
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

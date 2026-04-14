import { create } from "zustand";
import type { Log } from "../types";
import { socket } from "../lib/socket";

interface LogStore {
  logs: Log[];
  initializeSocket: () => void;
  fetchLogs: () => Promise<void>;
  addLog: (log: Log) => void;
}

let logSocketInitialized = false;

export const useLogStore = create<LogStore>((set, get) => ({
  logs: [],

  initializeSocket: () => {
    if (logSocketInitialized) return;
    logSocketInitialized = true;

    socket.on("log:new", (log: Log) => {
      set((state) => ({
        logs: [log, ...state.logs].slice(0, 200),
      }));
    });

    socket.on("connect", () => {
      console.log("Socket connected (logs)");
      get().fetchLogs();
    });
  },

  fetchLogs: async () => {
    try {
      const res = await fetch("/api/logs");
      if (res.ok) {
        const logs = await res.json();
        set({ logs });
      }
    } catch (err) {
      console.error("Failed to fetch logs", err);
    }
  },

  addLog: (log) => {
    set((state) => ({
      logs: [log, ...state.logs].slice(0, 200),
    }));
  },
}));

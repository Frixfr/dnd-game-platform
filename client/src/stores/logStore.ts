import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import type { Log } from "../types";

interface LogStore {
  logs: Log[];
  socket: Socket | null;
  initializeSocket: () => void;
  fetchLogs: () => Promise<void>;
  addLog: (log: Log) => void;
}

export const useLogStore = create<LogStore>((set, get) => ({
  logs: [],
  socket: null,

  initializeSocket: () => {
    const socket = io({
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("log:new", (log: Log) => {
      set((state) => ({
        logs: [log, ...state.logs].slice(0, 200),
      }));
    });

    socket.on("connect", () => {
      console.log("Socket connected (logs)");
      get().fetchLogs();
    });

    set({ socket });
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

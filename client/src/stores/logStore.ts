// client/src/stores/logStore.ts
import { create } from "zustand";
import type { Log } from "../types";
import { socket } from "../lib/socket";

let logSocketHandlers: {
  onLogNew: (log: Log) => void;
  onConnect: () => void;
} | null = null;
let logSocketInitialized = false;

interface LogStore {
  logs: Log[];
  initializeSocket: () => void;
  disconnectSocket: () => void;
  fetchLogs: () => Promise<void>;
  addLog: (log: Log) => void;
}

export const useLogStore = create<LogStore>((set, get) => ({
  logs: [],

  initializeSocket: () => {
    if (logSocketInitialized) return;
    logSocketInitialized = true;

    const onLogNew = (log: Log) => {
      get().addLog(log);
    };
    const onConnect = () => {
      console.log("Socket connected (logs)");
      get().fetchLogs();
    };

    socket.on("log:new", onLogNew);
    socket.on("connect", onConnect);

    logSocketHandlers = { onLogNew, onConnect };

    if (socket.connected) {
      get().fetchLogs();
    }
  },

  disconnectSocket: () => {
    if (!logSocketInitialized || !logSocketHandlers) return;
    const { onLogNew, onConnect } = logSocketHandlers;
    socket.off("log:new", onLogNew);
    socket.off("connect", onConnect);
    logSocketInitialized = false;
    logSocketHandlers = null;
    console.log("LogStore socket handlers removed");
  },

  fetchLogs: async () => {
    try {
      const res = await fetch("/api/logs");
      if (res.ok) {
        let logs = await res.json();
        logs.sort(
          (a: Log, b: Log) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
        if (logs.length > 200) logs = logs.slice(-200);
        set({ logs });
      }
    } catch (err) {
      console.error("Failed to fetch logs", err);
    }
  },

  addLog: (log) => {
    set((state) => {
      const newLogs = [...state.logs, log];
      if (newLogs.length > 200) newLogs.shift();
      return { logs: newLogs };
    });
  },
}));

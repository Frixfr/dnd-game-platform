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
  roomId: number | null;
  initializeSocket: () => void;
  disconnectSocket: () => void;
  setRoomId: (roomId: number | null) => void;
  fetchLogs: () => Promise<void>;
  addLog: (log: Log) => void;
}

export const useLogStore = create<LogStore>((set, get) => ({
  logs: [],
  roomId: null,

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

    const roomId = get().roomId;
    if (roomId !== null && roomId !== undefined) {
      socket.emit("join-room", { roomId });
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

  setRoomId: (roomId) => {
    set({ roomId });
    if (socket.connected) {
      socket.emit("join-room", { roomId });
    }
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

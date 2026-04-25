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
      get().addLog(log);
    });

    socket.on("connect", () => {
      console.log("Socket connected (logs)");
      get().fetchLogs();
    });

    // Если сокет уже подключен, fetchLogs всё равно нужно вызвать
    if (socket.connected) {
      get().fetchLogs();
    }
  },

  fetchLogs: async () => {
    try {
      const res = await fetch("/api/logs");
      if (res.ok) {
        let logs = await res.json();
        // Сортируем от старых к новым (по возрастанию даты)
        logs.sort(
          (a: Log, b: Log) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
        // Ограничиваем количество (оставляем последние 200)
        if (logs.length > 200) logs = logs.slice(-200);
        set({ logs });
      }
    } catch (err) {
      console.error("Failed to fetch logs", err);
    }
  },

  addLog: (log) => {
    set((state) => {
      // Добавляем новый лог в конец массива (старые → новые)
      const newLogs = [...state.logs, log];
      // Оставляем только последние 200 (самые новые)
      if (newLogs.length > 200) newLogs.shift();
      return { logs: newLogs };
    });
  },
}));

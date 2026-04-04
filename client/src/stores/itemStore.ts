// client/src/stores/itemStore.ts
import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import type { ItemType } from "../types";

interface ItemState {
  items: ItemType[];
  socket: Socket | null;
  addItem: (item: ItemType) => void;
  setItems: (items: ItemType[]) => void;
  initializeSocket: () => void;
  fetchItems: () => Promise<void>;
  updateItem: (item: ItemType) => void;
  removeItem: (id: number) => void;
}

export const useItemStore = create<ItemState>((set, get) => ({
  items: [],
  socket: null,

  initializeSocket: () => {
    if (typeof window === "undefined") return;

    const socket = io("http://localhost:5000", {
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    // Исправлено: событие "item:created"
    socket.on("item:created", (item: ItemType) => {
      console.log("Предмет создан (сокет):", item);
      set((state) => ({
        items: [...state.items, item],
      }));
    });

    // Добавлены обработчики для обновления и удаления (если сервер их шлёт)
    socket.on("item:updated", (item: ItemType) => {
      console.log("Предмет обновлён (сокет):", item);
      set((state) => ({
        items: state.items.map((i) => (i.id === item.id ? item : i)),
      }));
    });

    socket.on("item:deleted", ({ id }: { id: number }) => {
      console.log("Предмет удалён (сокет):", id);
      set((state) => ({
        items: state.items.filter((i) => i.id !== id),
      }));
    });

    socket.on("connect", async () => {
      console.log("Socket connected (items)");
      await get().fetchItems();
    });

    set({ socket });
  },

  addItem: (item) =>
    set((state) => ({
      items: [...state.items, item],
    })),

  setItems: (items) => set({ items }),

  updateItem: (item) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === item.id ? item : i)),
    })),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    })),

  fetchItems: async () => {
    try {
      const response = await fetch("http://localhost:5000/api/items");
      if (response.ok) {
        const items = await response.json();
        set({ items });
      }
    } catch (error) {
      console.error("Ошибка загрузки предметов:", error);
    }
  },
}));

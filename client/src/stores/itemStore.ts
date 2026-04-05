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
  disconnectSocket: () => void;
  fetchItems: () => Promise<void>;
  updateItem: (item: ItemType) => void;
  removeItem: (id: number) => void;
}

export const useItemStore = create<ItemState>((set, get) => ({
  items: [],
  socket: null,

  initializeSocket: () => {
    if (typeof window === "undefined") return;
    // Предотвращаем повторную инициализацию
    if (get().socket) return;

    const socket = io({
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.on("item:created", (item: ItemType) => {
      console.log("Предмет создан (сокет):", item);
      get().addItem(item);
    });

    socket.on("item:updated", (item: ItemType) => {
      console.log("Предмет обновлён (сокет):", item);
      get().updateItem(item);
    });

    socket.on("item:deleted", ({ id }: { id: number }) => {
      console.log("Предмет удалён (сокет):", id);
      get().removeItem(id);
    });

    socket.on("connect", async () => {
      console.log("Socket connected (items)");
      await get().fetchItems();
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },

  addItem: (item) =>
    set((state) => {
      // Защита от дублирования
      if (state.items.some((i) => i.id === item.id)) {
        return state;
      }
      return { items: [...state.items, item] };
    }),

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
      const response = await fetch("/api/items");
      if (response.ok) {
        const items = await response.json();
        set({ items });
      }
    } catch (error) {
      console.error("Ошибка загрузки предметов:", error);
    }
  },
}));

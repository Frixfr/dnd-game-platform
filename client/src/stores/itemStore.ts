// client/src/stores/itemStore.ts
import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import type { ItemType } from "../types";

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface ItemState {
  items: ItemType[];
  itemsTotal: number;
  currentPage: number;
  limit: number;
  socket: Socket | null;
  addItem: (item: ItemType) => void;
  setItems: (
    items: ItemType[],
    total: number,
    page: number,
    limit: number,
  ) => void;
  initializeSocket: () => void;
  disconnectSocket: () => void;
  fetchItems: (page?: number, limit?: number) => Promise<void>;
  fetchAllItems: () => Promise<ItemType[]>;
  updateItem: (item: ItemType) => void;
  removeItem: (id: number) => void;
}

export const useItemStore = create<ItemState>((set, get) => ({
  items: [],
  itemsTotal: 0,
  currentPage: 1,
  limit: 20,
  socket: null,

  initializeSocket: () => {
    if (typeof window === "undefined") return;
    if (get().socket) return;

    const socket = io({
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.on("item:created", async () => {
      console.log("Предмет создан (сокет)");
      const { currentPage, limit, fetchItems } = get();
      await fetchItems(currentPage, limit);
    });

    socket.on("item:updated", async () => {
      console.log("Предмет обновлён (сокет)");
      const { currentPage, limit, fetchItems } = get();
      await fetchItems(currentPage, limit);
    });

    socket.on("item:deleted", async () => {
      console.log("Предмет удалён (сокет)");
      const { currentPage, limit, fetchItems } = get();
      await fetchItems(currentPage, limit);
    });

    socket.on("connect", async () => {
      console.log("Socket connected (items)");
      const { currentPage, limit, fetchItems } = get();
      await fetchItems(currentPage, limit);
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

  fetchItems: async (page = 1, limit = 20) => {
    try {
      const response = await fetch(`/api/items?page=${page}&limit=${limit}`);
      if (response.ok) {
        const result: PaginatedResponse<ItemType> = await response.json();
        set({
          items: result.data,
          itemsTotal: result.total,
          currentPage: result.page,
          limit: result.limit,
        });
      }
    } catch (error) {
      console.error("Ошибка загрузки предметов:", error);
    }
  },

  fetchAllItems: async () => {
    try {
      const response = await fetch("/api/items?limit=9999");
      if (response.ok) {
        const result = await response.json();
        return Array.isArray(result) ? result : result.data;
      }
      return [];
    } catch (error) {
      console.error("Ошибка загрузки всех предметов:", error);
      return [];
    }
  },

  addItem: (item) =>
    set((state) => {
      if (state.items.some((i) => i.id === item.id)) return state;
      return { items: [...state.items, item] };
    }),

  setItems: (items, total, page, limit) =>
    set({ items, itemsTotal: total, currentPage: page, limit }),

  updateItem: (item) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === item.id ? item : i)),
    })),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    })),
}));

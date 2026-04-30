// client/src/stores/itemStore.ts
import { create } from "zustand";
import type { ItemType } from "../types";
import { socket } from "../lib/socket";

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

let itemSocketHandlers: {
  onConnect: () => void;
  onCreated: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
} | null = null;
let itemSocketInitialized = false;

interface ItemState {
  items: ItemType[];
  itemsTotal: number;
  currentPage: number;
  limit: number;
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

  initializeSocket: () => {
    if (itemSocketInitialized) return;
    itemSocketInitialized = true;

    const onConnect = async () => {
      const { currentPage, limit, fetchItems } = get();
      await fetchItems(currentPage, limit);
    };
    const onCreated = async () => {
      const { currentPage, limit, fetchItems } = get();
      await fetchItems(currentPage, limit);
    };
    const onUpdated = async () => {
      const { currentPage, limit, fetchItems } = get();
      await fetchItems(currentPage, limit);
    };
    const onDeleted = async () => {
      const { currentPage, limit, fetchItems } = get();
      await fetchItems(currentPage, limit);
    };

    socket.on("connect", onConnect);
    socket.on("item:created", onCreated);
    socket.on("item:updated", onUpdated);
    socket.on("item:deleted", onDeleted);

    itemSocketHandlers = { onConnect, onCreated, onUpdated, onDeleted };
  },

  disconnectSocket: () => {
    if (!itemSocketInitialized || !itemSocketHandlers) return;
    const { onConnect, onCreated, onUpdated, onDeleted } = itemSocketHandlers;
    socket.off("connect", onConnect);
    socket.off("item:created", onCreated);
    socket.off("item:updated", onUpdated);
    socket.off("item:deleted", onDeleted);
    itemSocketInitialized = false;
    itemSocketHandlers = null;
    console.log("ItemStore socket handlers removed");
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

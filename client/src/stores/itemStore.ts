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

// Тип для хэндлеров сокетов
interface SocketHandlers {
  onItemCreated: () => Promise<void>;
  onItemUpdated: () => Promise<void>;
  onItemDeleted: () => Promise<void>;
  onConnect: () => Promise<void>;
}

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
  // внутреннее хранилище хэндлеров (не для внешнего использования)
  __socketHandlers?: SocketHandlers;
}

let itemSocketInitialized = false;

export const useItemStore = create<ItemState>((set, get) => ({
  items: [],
  itemsTotal: 0,
  currentPage: 1,
  limit: 20,

  initializeSocket: () => {
    if (itemSocketInitialized) return;
    itemSocketInitialized = true;

    const onItemCreated = async () => {
      console.log("Предмет создан (сокет)");
      const { currentPage, limit, fetchItems } = get();
      await fetchItems(currentPage, limit);
    };
    const onItemUpdated = async () => {
      console.log("Предмет обновлён (сокет)");
      const { currentPage, limit, fetchItems } = get();
      await fetchItems(currentPage, limit);
    };
    const onItemDeleted = async () => {
      console.log("Предмет удалён (сокет)");
      const { currentPage, limit, fetchItems } = get();
      await fetchItems(currentPage, limit);
    };
    const onConnect = async () => {
      console.log("Socket connected (items)");
      const { currentPage, limit, fetchItems } = get();
      await fetchItems(currentPage, limit);
    };

    socket.on("item:created", onItemCreated);
    socket.on("item:updated", onItemUpdated);
    socket.on("item:deleted", onItemDeleted);
    socket.on("connect", onConnect);

    set({
      __socketHandlers: {
        onItemCreated,
        onItemUpdated,
        onItemDeleted,
        onConnect,
      },
    });
  },

  disconnectSocket: () => {
    if (!itemSocketInitialized) return;
    const handlers = get().__socketHandlers;
    if (handlers) {
      socket.off("item:created", handlers.onItemCreated);
      socket.off("item:updated", handlers.onItemUpdated);
      socket.off("item:deleted", handlers.onItemDeleted);
      socket.off("connect", handlers.onConnect);
      set({ __socketHandlers: undefined });
    }
    itemSocketInitialized = false;
    console.log("Item socket disconnected");
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

// client/src/store/playerStore.ts
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { ItemType } from '../types';

interface ItemState {
  items: ItemType[];
  socket: Socket | null;
  addItem: (item: ItemType) => void;
  setItems: (items: ItemType[]) => void;
  initializeSocket: () => void;
  fetchItems: () => Promise<void>;
}

export const useItemStore = create<ItemState>((set) => ({
  items: [],
  socket: null,
  
  // Добавление игрока в локальное состояние (используется при получении через сокет)
  addItem: (item) => set(state => ({
    items: [...state.items, item]
  })),
  
  // Обновление всего списка (при первоначальной загрузке)
  setItems: (items) => set({ items }),
  
  // Инициализация сокет-соединения с обработкой события
  initializeSocket: () => {
    if (typeof window === 'undefined') return;
    
    const socket = io('http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling'], // Явно указываем транспорты
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5
    });
    
    socket.on('itemCreated', (item: ItemType) => {
      set(state => ({
        items: [...state.items, item]
      }));
    });

    // Инициализация: загружаем начальный список игроков
    socket.on('connect', async () => {
      const { fetchItems } = get();
      await fetchItems();
    });
    
    set({ socket: socket });
  },

  fetchItems: async () => {
    try {
      const response = await fetch('http://localhost:5000/api/items');
      if (response.ok) {
        const items = await response.json();
        set({ items });
      }
    } catch (error) {
      console.error('Ошибка загрузки игроков:', error);
    }
  }
}));
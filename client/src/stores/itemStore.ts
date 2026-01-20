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
    
    const newSocket = io('http://localhost:5000', {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5
    });
    
    newSocket.on('itemCreated', (item: ItemType) => {
      set(state => ({
        items: [...state.items, item]
      }));
    });
    
    set({ socket: newSocket });
  }
}));
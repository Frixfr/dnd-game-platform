// client/src/store/playerStore.ts
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { EffectType } from '../types';

interface EffectState {
  effects: EffectType[];
  socket: Socket | null;
  addEffect: (effect: EffectType) => void;
  setEffects: (effects: EffectType[]) => void;
  initializeSocket: () => void;
  fetchEffects: () => Promise<void>;
}

export const useEffectStore = create<EffectState>((set, get) => ({
  effects: [],
  socket: null,
  
  // Добавление игрока в локальное состояние (используется при получении через сокет)
  addEffect: (effect) => set(state => ({
    effects: [...state.effects, effect]
  })),
  
  // Обновление всего списка (при первоначальной загрузке)
  setEffects: (effects) => set({ effects }),
  
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
    
    socket.on('effectCreated', (effect: EffectType) => {
      set(state => ({
        effects: [...state.effects, effect]
      }));
    });

    // Инициализация: загружаем начальный список игроков
    socket.on('connect', async () => {
      const { fetchEffects } = get();
      await fetchEffects();
    });
    
    set({ socket: socket });
  },

  fetchEffects: async () => {
    try {
      const response = await fetch('http://localhost:5000/api/effects');
      if (response.ok) {
        const effects = await response.json();
        set({ effects });
      }
    } catch (error) {
      console.error('Ошибка загрузки игроков:', error);
    }
  }
}));
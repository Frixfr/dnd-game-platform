// client/src/store/playerStore.ts
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { AbilityType } from '../types';

interface AbilityState {
  abilities: AbilityType[];
  socket: Socket | null;
  addAbility: (ability: AbilityType) => void;
  setAbilities: (abilities: AbilityType[]) => void;
  initializeSocket: () => void;
  fetchAbilities: () => Promise<void>;
}

export const useAbilityStore = create<AbilityState>((set) => ({
  abilities: [],
  socket: null,
  
  // Добавление игрока в локальное состояние (используется при получении через сокет)
  addAbility: (ability) => set(state => ({
    abilities: [...state.abilities, ability]
  })),
  
  // Обновление всего списка (при первоначальной загрузке)
  setAbilities: (abilities) => set({ abilities }),
  
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
    
    socket.on('abilityCreated', (ability: AbilityType) => {
      set(state => ({
        abilities: [...state.abilities, ability]
      }));
    });

    // Инициализация: загружаем начальный список игроков
    socket.on('connect', async () => {
      const { fetchAbilities } = get();
      await fetchAbilities();
    });

    set({ socket: socket });
  },

  fetchAbilities: async () => {
    try {
      const response = await fetch('http://localhost:5000/api/abilities');
      if (response.ok) {
        const abilities = await response.json();
        set({ abilities });
      }
    } catch (error) {
      console.error('Ошибка загрузки игроков:', error);
    }
  }
}));
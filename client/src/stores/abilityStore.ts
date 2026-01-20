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
    
    const newSocket = io('http://localhost:5000', {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5
    });
    
    newSocket.on('abilityCreated', (ability: AbilityType) => {
      set(state => ({
        abilities: [...state.abilities, ability]
      }));
    });
    
    set({ socket: newSocket });
  }
}));
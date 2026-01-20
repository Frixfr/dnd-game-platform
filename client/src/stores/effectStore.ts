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
}

export const useEffectStore = create<EffectState>((set) => ({
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
    
    const newSocket = io('http://localhost:5000', {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5
    });
    
    newSocket.on('effectCreated', (effect: EffectType) => {
      set(state => ({
        effects: [...state.effects, effect]
      }));
    });
    
    set({ socket: newSocket });
  }
}));
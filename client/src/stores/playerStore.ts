// client/src/store/playerStore.ts
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { PlayerType } from '../types';

interface PlayerState {
  players: PlayerType[];
  socket: Socket | null;
  addPlayer: (player: PlayerType) => void;
  setPlayers: (players: PlayerType[]) => void;
  initializeSocket: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  players: [],
  socket: null,
  
  // Добавление игрока в локальное состояние (используется при получении через сокет)
  addPlayer: (player) => set(state => ({
    players: [...state.players, player]
  })),
  
  // Обновление всего списка (при первоначальной загрузке)
  setPlayers: (players) => set({ players }),
  
  // Инициализация сокет-соединения с обработкой события
  initializeSocket: () => {
    if (typeof window === 'undefined') return;
    
    const newSocket = io('http://localhost:5000', {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5
    });
    
    newSocket.on('playerCreated', (player: PlayerType) => {
      set(state => ({
        players: [...state.players, player]
      }));
    });
    
    set({ socket: newSocket });
  }
}));
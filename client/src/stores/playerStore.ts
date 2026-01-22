// client/src/store/playerStore.ts
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { PlayerType } from '../types';

interface PlayerStore {
  players: PlayerType[];
  socket: Socket | null;
  initializeSocket: () => void;
  addPlayer: (player: PlayerType) => void;
  updatePlayer: (updatedPlayer: PlayerType) => void;
  deletePlayer: (playerId: number) => void;
  setPlayers: (players: PlayerType[]) => void;
  fetchPlayers: () => Promise<void>;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  players: [],
  socket: null,
  
  initializeSocket: () => {
    const socket = io('http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling'], // Явно указываем транспорты
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5
    });
    
    socket.on('playerCreated', (player: PlayerType) => {
      set((state) => ({
        players: [...state.players, player]
      }));
    });
    
    socket.on('playerUpdated', (player: PlayerType) => {
      set((state) => ({
        players: state.players.map(p => 
          p.id === player.id ? player : p
        )
      }));
    });
    
    socket.on('playerDeleted', (playerId: number) => {
      set((state) => ({
        players: state.players.filter(p => p.id !== playerId)
      }));
    });

    // Инициализация: загружаем начальный список игроков
    socket.on('connect', async () => {
      const { fetchPlayers } = get();
      await fetchPlayers();
    });
    
    set({ socket });
  },

  fetchPlayers: async () => {
    try {
      const response = await fetch('http://localhost:5000/api/players');
      if (response.ok) {
        const players = await response.json();
        set({ players });
      }
    } catch (error) {
      console.error('Ошибка загрузки игроков:', error);
    }
  },
  
  addPlayer: (player) => {
    set((state) => ({
      players: [...state.players, player]
    }));
  },
  
  updatePlayer: (updatedPlayer) => {
    set((state) => ({
      players: state.players.map(player =>
        player.id === updatedPlayer.id ? updatedPlayer : player
      )
    }));
  },
  
  deletePlayer: (playerId) => {
    set((state) => ({
      players: state.players.filter(player => player.id !== playerId)
    }));
  },
  
  setPlayers: (players) => {
    set({ players });
  },
}));
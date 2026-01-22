// client/src/stores/abilityStore.ts
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { AbilityType } from '../types';

interface AbilityStore {
  abilities: AbilityType[];
  socket: Socket | null;
  addAbility: (ability: AbilityType) => void;
  setAbilities: (abilities: AbilityType[]) => void;
  updateAbility: (updatedAbility: AbilityType) => void;
  removeAbility: (abilityId: number) => void;
  initializeSocket: () => void;
  fetchAbilities: () => Promise<void>;
}

interface AbilityState {
  abilities: AbilityType[];
  socket: Socket | null;
  addAbility: (ability: AbilityType) => void;
  setAbilities: (abilities: AbilityType[]) => void;
  updateAbility: (updatedAbility: AbilityType) => void; // Добавьте это
  removeAbility: (id: number) => void; // Добавьте это
  initializeSocket: () => void;
  fetchAbilities: () => Promise<void>;
}

export const useAbilityStore = create<AbilityStore>((set, get) => ({
  abilities: [],
  socket: null,
  
  // Добавление способности
  addAbility: (ability) => set(state => ({
    abilities: [...state.abilities, ability]
  })),
  
  // Обновление всего списка
  setAbilities: (abilities) => set({ abilities }),
  
  // Обновление конкретной способности
  updateAbility: (updatedAbility) => set(state => ({
    abilities: state.abilities.map(a => 
      a.id === updatedAbility.id ? updatedAbility : a
    )
  })),
  
  // Удаление способности
  removeAbility: (abilityId) => set(state => ({
    abilities: state.abilities.filter(a => a.id !== abilityId)
  })),
  
  // Инициализация сокет-соединения
  initializeSocket: () => {
    if (typeof window === 'undefined') return;
    
    const socket = io('http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5
    });
    
    // Обработчик новой способности
    socket.on('ability:created', (ability: AbilityType) => {
      console.log('Новая способность создана через сокет:', ability);
      set(state => ({
        abilities: [ability, ...state.abilities]
      }));
    });
    
    // Обработчик обновления способности
    socket.on('ability:updated', (ability: AbilityType) => {
      console.log('Способность обновлена через сокет:', ability);
      set(state => ({
        abilities: state.abilities.map(a => 
          a.id === ability.id ? ability : a
        )
      }));
    });
    
    // Обработчик удаления способности
    socket.on('ability:deleted', ({ id }: { id: number }) => {
      console.log('Способность удалена через сокет:', id);
      set(state => ({
        abilities: state.abilities.filter(a => a.id !== id)
      }));
    });

    // Инициализация: загружаем начальный список способностей
    socket.on('connect', async () => {
      console.log('Сокет подключен к способностям');
      const { fetchAbilities } = get();
      await fetchAbilities();
    });

    set({ socket: socket });
  },  

  // Загрузка способностей с сервера
  fetchAbilities: async () => {
    try {
      const response = await fetch('http://localhost:5000/api/abilities');
      if (response.ok) {
        const abilities = await response.json();
        set({ abilities });
        console.log('Способности загружены:', abilities.length);
      }
    } catch (error) {
      console.error('Ошибка загрузки способностей:', error);
    }
  }
}));
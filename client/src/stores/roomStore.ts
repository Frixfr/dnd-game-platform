// client/src/stores/roomStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as roomsApi from "../api/roomsApi";
import * as masterApi from "../api/masterApi";
import type { Room } from "../api/roomsApi";
import { AxiosError } from "axios";

interface RoomStore {
  token: string | null;
  masterToken: string | null;
  currentRoom: { id: number; name: string } | null;
  rooms: Room[];
  isLoading: boolean;
  error: string | null;

  loginAsMaster: (password: string) => Promise<void>;
  fetchRooms: () => Promise<void>;
  createRoom: (name: string) => Promise<void>;
  updateRoom: (
    id: number,
    data: { name?: string; password?: string | null },
  ) => Promise<void>;
  deleteRoom: (id: number) => Promise<void>;
  setActiveRoom: (id: number) => Promise<void>;
  enterRoom: (id: number, password?: string) => Promise<void>;
  leaveRoom: () => void;
  logout: () => void;
  clearError: () => void;
  initialize: () => void;
}

// Вспомогательная функция для извлечения сообщения ошибки
const getErrorMessage = (err: unknown): string => {
  if (err instanceof AxiosError) {
    return err.response?.data?.message || err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Неизвестная ошибка";
};

export const useRoomStore = create<RoomStore>()(
  persist(
    (set, get) => ({
      token: null,
      masterToken: null,
      currentRoom: null,
      rooms: [],
      isLoading: false,
      error: null,

      initialize: () => {
        const token = get().token;
        const masterToken = get().masterToken;
        const currentRoom = get().currentRoom;
        console.log("[RoomStore] Initialized", {
          token: !!token,
          masterToken: !!masterToken,
          currentRoom,
        });
        // Синхронизируем с localStorage для axios-интерцептора
        if (token) {
          localStorage.setItem("master-token", token);
        } else {
          localStorage.removeItem("master-token");
        }
      },

      loginAsMaster: async (password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await masterApi.loginMaster(password);
          // Сохраняем токен как мастер-токен (без комнаты) и как текущий токен
          set({
            masterToken: response.token,
            token: response.token,
            isLoading: false,
          });
          // Синхронизация с localStorage
          localStorage.setItem("master-token", response.token);
        } catch (err) {
          const errorMsg = getErrorMessage(err);
          set({ error: errorMsg, isLoading: false });
          throw err;
        }
      },

      fetchRooms: async () => {
        set({ isLoading: true, error: null });
        try {
          const rooms = await roomsApi.getRooms();
          set({ rooms, isLoading: false });
        } catch (err) {
          const errorMsg = getErrorMessage(err) || "Ошибка загрузки комнат";
          set({ error: errorMsg, isLoading: false });
          throw err;
        }
      },

      createRoom: async (name: string) => {
        set({ isLoading: true, error: null });
        try {
          const newRoom = await roomsApi.createRoom(name);
          set((state) => ({
            rooms: [...state.rooms, newRoom],
            isLoading: false,
          }));
        } catch (err) {
          const errorMsg = getErrorMessage(err) || "Ошибка создания комнаты";
          set({ error: errorMsg, isLoading: false });
          throw err;
        }
      },

      updateRoom: async (
        id: number,
        data: { name?: string; password?: string | null },
      ) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await roomsApi.updateRoom(id, data);
          set((state) => ({
            rooms: state.rooms.map((r) => (r.id === id ? updated : r)),
            isLoading: false,
          }));
        } catch (err) {
          const errorMsg = getErrorMessage(err) || "Ошибка обновления комнаты";
          set({ error: errorMsg, isLoading: false });
          throw err;
        }
      },

      deleteRoom: async (id: number) => {
        set({ isLoading: true, error: null });
        try {
          await roomsApi.deleteRoom(id);
          set((state) => ({
            rooms: state.rooms.filter((r) => r.id !== id),
            isLoading: false,
          }));
          const current = get().currentRoom;
          if (current && current.id === id) {
            // Если удалили текущую комнату, выходим из неё
            get().leaveRoom();
          }
        } catch (err) {
          const errorMsg = getErrorMessage(err) || "Ошибка удаления комнаты";
          set({ error: errorMsg, isLoading: false });
          throw err;
        }
      },

      setActiveRoom: async (id: number) => {
        set({ isLoading: true, error: null });
        try {
          await roomsApi.setActiveRoom(id);
          await get().fetchRooms();
        } catch (err) {
          const errorMsg = getErrorMessage(err) || "Ошибка активации комнаты";
          set({ error: errorMsg, isLoading: false });
          throw err;
        }
      },

      enterRoom: async (id: number, password?: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await roomsApi.enterRoom(id, password);
          // Сохраняем новый токен (с комнатой), masterToken не меняем
          set({
            token: response.token,
            masterToken: response.token, // Обновляем мастер-токен с roomId
            currentRoom: { id: response.room.id, name: response.room.name },
            isLoading: false,
          });
          // Синхронизация с localStorage
          localStorage.setItem("master-token", response.token);
          await get().fetchRooms();
        } catch (err) {
          const errorMsg = getErrorMessage(err) || "Ошибка входа в комнату";
          set({ error: errorMsg, isLoading: false });
          throw err;
        }
      },

      leaveRoom: () => {
        const { masterToken } = get();
        if (masterToken) {
          // Возвращаемся к мастер-токену без комнаты
          set({
            token: masterToken,
            currentRoom: null,
          });
          // Обновляем localStorage (токен не меняется, но можно перезаписать)
          localStorage.setItem("master-token", masterToken);
        } else {
          // Если по какой-то причине мастер-токен отсутствует, делаем полный выход
          get().logout();
        }
      },

      logout: () => {
        set({
          token: null,
          masterToken: null,
          currentRoom: null,
          rooms: [],
          error: null,
        });
        localStorage.removeItem("master-token");
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "room-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        masterToken: state.masterToken,
        currentRoom: state.currentRoom,
      }),
    },
  ),
);

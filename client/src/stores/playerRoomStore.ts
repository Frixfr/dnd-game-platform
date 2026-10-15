// client/src/stores/playerRoomStore.ts
// Хранит id активной кампании (комнаты), в которую входит игрок.
// Используется при публичном логине по паролю (/api/public/players/login),
// чтобы сервер искал персонажа только в этой комнате.
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PlayerRoomStore {
  roomId: number | null;
  roomName: string | null;
  setRoom: (room: { id: number; name: string } | null) => void;
  clearRoom: () => void;
}

export const usePlayerRoomStore = create<PlayerRoomStore>()(
  persist(
    (set) => ({
      roomId: null,
      roomName: null,
      setRoom: (room) =>
        set({
          roomId: room ? room.id : null,
          roomName: room ? room.name : null,
        }),
      clearRoom: () => set({ roomId: null, roomName: null }),
    }),
    { name: "player-room-storage" },
  ),
);

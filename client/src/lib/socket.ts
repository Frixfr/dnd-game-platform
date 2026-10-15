// client/src/lib/socket.ts
import { io, Socket } from "socket.io-client";
import { useRoomStore } from "../stores/roomStore";
import { SOCKET_URL } from "./config";

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    // URL не зашиваем: по умолчанию соединение идёт на тот же origin,
    // что и страница (через dev-прокси Vite). При необходимости адрес
    // бэкенда задаётся в .env (VITE_SOCKET_URL).
    socketInstance = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    // При каждом (пере)подключении переподписываемся на текущую комнату,
    // чтобы мастер получал живые обновления без перезагрузки страницы.
    socketInstance.on("connect", () => {
      const roomId = useRoomStore.getState().currentRoom?.id ?? null;
      socketInstance!.emit("join-room", { roomId });
    });
  }
  return socketInstance;
}

/**
 * Гарантирует, что сокет-синглтон жив: если он был разорван (например,
 * после logout или из-за потери сети), пересоздаём соединение.
 * Вызывается при входе в игровые зоны (MasterLayout / PlayerLayout),
 * чтобы навигация между страницами не оставляла "мёртвый" сокет.
 */
export function ensureConnected(): Socket {
  const s = getSocket();
  if (!s.connected && !s.active) {
    // active === false и connected === false — сокет намеренно отключён,
    // реактивировать его штатным reconnect нельзя, переподключаемся явно.
    s.connect();
  }
  return s;
}

/**
 * Выход из всех комнат сокета (игровой `room:<id>`, а также `map:<id>`
 * и `player:<id>`, к которым присоединяются клиентские подписки).
 * Используется при leaveRoom/logout, чтобы сервер перестал слать этому
 * клиенту события комнаты. Обработчики событий при этом снимаются
 * отдельно — через disconnectAllSocketHandlers().
 */
export function leaveAllRooms(): void {
  if (!socketInstance) return;
  const rooms = Object.keys(socketInstance.rooms ?? {});
  for (const room of rooms) {
    // служебная комната с собственным id сокета — не является "нашей"
    if (room === socketInstance.id) continue;
    if (
      room.startsWith("room:") ||
      room.startsWith("map:") ||
      room.startsWith("player:")
    ) {
      socketInstance.leave(room);
    }
  }
  // Явно сообщаем серверу о выходе из текущей игровой комнаты
  socketInstance.emit("leave-room", {});
}

export const socket = getSocket();

declare global {
  interface Window {
    __socket: typeof socket;
  }
}
window.__socket = socket;

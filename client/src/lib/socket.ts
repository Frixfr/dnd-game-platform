// client/src/lib/socket.ts
import { io, Socket } from "socket.io-client";
import { useRoomStore } from "../stores/roomStore";

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io({
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

export const socket = getSocket();

declare global {
  interface Window {
    __socket: typeof socket;
  }
}
window.__socket = socket;

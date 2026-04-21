// client/src/lib/socket.ts
import { io, Socket } from "socket.io-client";

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
    // Убираем socket.onAny – больше не нужен
  }
  return socketInstance;
}

export const socket = getSocket();

declare global {
  interface Window {
    __socket: typeof socket;
  }
}
window.__socket = socket;

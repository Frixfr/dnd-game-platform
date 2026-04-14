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
    console.log("Socket singleton created");
  }
  return socketInstance;
}

// Экспортируем сам сокет (для удобства, но лучше использовать getSocket)
export const socket = getSocket();

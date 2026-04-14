// server/src/socket/index.ts

import { Server as SocketServer, ServerOptions, Socket } from "socket.io";
import { Server as HttpServer } from "http";

let io: SocketServer;

export function initSocket(
  server: HttpServer,
  options?: Partial<ServerOptions>,
) {
  io = new SocketServer(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "*",
      methods: ["GET", "POST"],
    },
    ...options,
  });

  io.on("connection", (socket: Socket) => {
    console.log("Новый клиент подключен:", socket.id);

    // Пример обработки событий от клиента (можно расширить)
    socket.on("join-player", (playerId: string) => {
      socket.join(`player:${playerId}`);
      console.log(`Socket ${socket.id} joined room player:${playerId}`);
    });

    socket.on("disconnect", () => {
      console.log("Клиент отключился:", socket.id);
    });
  });

  return io;
}

export function getIO(): SocketServer {
  if (!io) {
    throw new Error(
      "Socket.IO не инициализирован. Вызовите initSocket сначала.",
    );
  }
  return io;
}

// Утилиты для удобной отправки событий
export const emitToAll = (event: string, data: any) => {
  getIO().emit(event, data);
};

export const emitToPlayer = (
  playerId: string | number,
  event: string,
  data: any,
) => {
  getIO().to(`player:${playerId}`).emit(event, data);
};

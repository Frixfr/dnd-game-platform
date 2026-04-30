// server/src/socket/index.ts

import { Server as SocketServer, ServerOptions, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { getFullPlayerData, getFullNpcData } from "../utils/helpers.js";

const MASTER_PASSWORD = "dm123"; // Хардкод по ТЗ

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

    // Аутентификация мастера
    socket.on("master:auth", (password: string) => {
      if (password === MASTER_PASSWORD) {
        socket.join("master-room");
        console.log(
          `Socket ${socket.id} аутентифицирован как мастер и добавлен в master-room`,
        );
        socket.emit("master:auth:success");
      } else {
        socket.emit("master:auth:error", "Неверный пароль");
      }
    });

    // Подписка игрока на свою комнату
    socket.on("join-player", (playerId: string) => {
      socket.join(`player:${playerId}`);
      console.log(`Socket ${socket.id} joined room player:${playerId}`);
    });

    // Запрос лечения/урона от игрока (отправляется только мастерам)
    socket.on(
      "heal-damage-request",
      (data: {
        playerId: number;
        playerName: string;
        amount: number;
        isHeal: boolean;
        message?: string;
      }) => {
        console.log(
          `Heal/damage request from ${data.playerName} (${data.playerId}): ${data.isHeal ? "лечение" : "урон"} ${data.amount}`,
        );
        // Отправляем только в комнату мастеров
        io.to("master-room").emit("heal-damage-request", {
          ...data,
          requesterSocketId: socket.id,
          timestamp: new Date().toISOString(),
        });
      },
    );

    // Подписка на карту
    socket.on("join-map", (mapId: number) => {
      socket.join(`map:${mapId}`);
      console.log(`Socket ${socket.id} joined map ${mapId}`);
    });

    socket.on("leave-map", (mapId: number) => {
      socket.leave(`map:${mapId}`);
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

export function emitToPlayer(playerId: number, event: string, data: any) {
  const io = getIO();
  io.to(`player:${playerId}`).emit(event, data);
}

export async function emitPlayerUpdate(playerId: number): Promise<void> {
  const fullData = await getFullPlayerData(String(playerId));
  if (fullData) {
    getIO().emit("player:updated", fullData);
  }
}

export async function emitNpcUpdate(npcId: number): Promise<void> {
  const fullData = await getFullNpcData(String(npcId));
  if (fullData) {
    getIO().emit("npc:updated", fullData);
  }
}

// server/src/socket/index.ts

import { Server as SocketServer, ServerOptions, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { jwtConfig, JwtPayload } from "../config/jwt.js";
import { getFullPlayerData, getFullNpcData } from "../utils/helpers.js";

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

    // Аутентификация мастера через JWT
    socket.on("master:auth", (token: string) => {
      try {
        const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;
        if (decoded.role !== "master") {
          socket.emit("master:auth:error", "Неверная роль");
          return;
        }
        if (decoded.roomId) {
          // Мастер в комнате
          socket.data.roomId = decoded.roomId;
          socket.data.role = "master";
          socket.join(`room:${decoded.roomId}`);
          socket.emit("master:auth:success", { roomId: decoded.roomId });
          console.log(`Мастер аутентифицирован, комната ${decoded.roomId}`);
        } else {
          // Мастер без комнаты (на странице списка)
          socket.data.role = "master";
          socket.emit("master:auth:success", { roomId: null });
          console.log("Мастер аутентифицирован без комнаты");
        }
      } catch (error) {
        socket.emit("master:auth:error", "Недействительный токен");
      }
    });

    // Подписка игрока на свою комнату (игрок передаёт playerId)
    socket.on("join-player", async (playerId: string) => {
      try {
        // Получаем игрока из БД, чтобы узнать room_id
        const player = await getFullPlayerData(playerId);
        if (player) {
          const roomId = player.room_id;
          socket.data.roomId = roomId;
          socket.data.playerId = Number(playerId);
          socket.join(`room:${roomId}`);
          socket.join(`player:${playerId}`);
          console.log(`Игрок ${playerId} присоединился к комнате ${roomId}`);
        } else {
          socket.emit("error", "Игрок не найден");
        }
      } catch (error) {
        socket.emit("error", "Ошибка присоединения");
      }
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
        // Отправляем только в комнату мастеров с тем же roomId
        const roomId = socket.data.roomId;
        if (roomId) {
          io.to(`room:${roomId}`).emit("heal-damage-request", {
            ...data,
            requesterSocketId: socket.id,
            timestamp: new Date().toISOString(),
          });
        }
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
    const roomId = fullData.room_id;
    getIO().to(`room:${roomId}`).emit("player:updated", fullData);
  }
}

export async function emitNpcUpdate(npcId: number): Promise<void> {
  const fullData = await getFullNpcData(String(npcId));
  if (fullData) {
    const roomId = fullData.room_id;
    getIO().to(`room:${roomId}`).emit("npc:updated", fullData);
  }
}

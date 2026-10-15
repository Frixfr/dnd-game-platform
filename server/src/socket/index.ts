// server/src/socket/index.ts

import { Server as SocketServer, ServerOptions, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { jwtConfig, JwtPayload } from "../config/jwt.js";
import { getFullPlayerData, getFullNpcData } from "../utils/helpers.js";

let io: SocketServer;

// Присоединение сокета к комнате room:${roomId} (с выходом из предыдущей)
function joinRoom(socket: Socket, roomId: number): void {
  const prevRoomId = socket.data.roomId as number | undefined;
  if (prevRoomId && prevRoomId !== roomId) {
    socket.leave(`room:${prevRoomId}`);
  }
  socket.data.roomId = roomId;
  socket.join(`room:${roomId}`);
}

// Выход сокета из текущей комнаты
function leaveCurrentRoom(socket: Socket): void {
  const prevRoomId = socket.data.roomId as number | undefined;
  if (prevRoomId) {
    socket.leave(`room:${prevRoomId}`);
  }
  delete socket.data.roomId;
}

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

    // Аутентификация мастера через JWT (поддерживается для обратной совместимости).
    // После успешной аутентификации мастер сразу попадает в комнату room:${roomId}.
    socket.on("master:auth", (token: string) => {
      try {
        const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;
        if (decoded.role !== "master") {
          socket.emit("master:auth:error", "Неверная роль");
          return;
        }
        socket.data.role = "master";
        if (decoded.roomId) {
          // Мастер в комнате
          joinRoom(socket, decoded.roomId);
          socket.emit("master:auth:success", { roomId: decoded.roomId });
          console.log(`Мастер аутентифицирован, комната ${decoded.roomId}`);
        } else {
          // Мастер без комнаты (на странице списка)
          leaveCurrentRoom(socket);
          socket.emit("master:auth:success", { roomId: null });
          console.log("Мастер аутентифицирован без комнаты");
        }
      } catch (error) {
        socket.emit("master:auth:error", "Недействительный токен");
      }
    });

    // Присоединение к комнате room:${roomId}.
    // Основной способ подписки: клиент (мастер) шлёт join-room после логина,
    // входа/выхода из комнаты и при каждом (пере)подключении сокета.
    // Ожидается payload: { roomId: number | null } или просто roomId.
    socket.on("join-room", (payload: unknown) => {
      const raw =
        payload !== null && typeof payload === "object"
          ? (payload as { roomId?: unknown }).roomId
          : payload;
      const roomId = Number(raw);

      if (raw === null || raw === undefined || raw === "" || Number.isNaN(roomId)) {
        // Выход из комнаты (например, мастер на странице списка комнат)
        leaveCurrentRoom(socket);
        console.log(`Socket ${socket.id} вышел из комнаты`);
        return;
      }

      joinRoom(socket, roomId);
      console.log(`Socket ${socket.id} присоединился к комнате ${roomId}`);
      socket.emit("joined-room", { roomId });
    });

    // Явный выход из комнаты
    socket.on("leave-room", (payload: unknown) => {
      const raw =
        payload !== null && typeof payload === "object"
          ? (payload as { roomId?: unknown }).roomId
          : payload;
      const roomId = Number(raw) || socket.data.roomId;
      if (roomId) {
        socket.leave(`room:${roomId}`);
        if (socket.data.roomId === roomId) delete socket.data.roomId;
        console.log(`Socket ${socket.id} покинул комнату ${roomId}`);
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

// Комнатные события отправляются только в комнату room:${roomId}
export function emitToRoom(roomId: number, event: string, data: any) {
  if (!roomId) return;
  getIO().to(`room:${roomId}`).emit(event, data);
}

// Публичные (не комнатные) события — всем подключённым клиентам.
// Используется только для событий вне комнат (например, room:active-changed).
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

// server/src/socket/index.ts

import { Server as SocketServer, ServerOptions, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { jwtConfig, JwtPayload } from "../config/jwt.js";
import { getFullPlayerData, getFullNpcData } from "../utils/helpers.js";

let io: SocketServer;

// Комната, к которой сокет присоединён "по работе" (мастер или игрок).
// Хранится как Set, т.к. один сокет может состоять сразу в нескольких
// room:* (например, игрок, зашедший в несколько комнат подряд).
const ROOM_SET_KEY = "roomIds";

function addTrackedRoom(socket: Socket, roomId: number): void {
  const set: Set<number> =
    (socket.data[ROOM_SET_KEY] as Set<number> | undefined) ?? new Set();
  set.add(roomId);
  socket.data[ROOM_SET_KEY] = set;
}

function removeTrackedRoom(socket: Socket, roomId: number): void {
  const set = socket.data[ROOM_SET_KEY] as Set<number> | undefined;
  if (set) set.delete(roomId);
}

// Присоединение сокета к комнате room:${roomId}.
// Выходим только из предыдущей комнаты мастера (socket.data.roomId),
// чтобы не «разъединять» подписки игрока на его собственную комнату
// (join-player также пишет в socket.data.roomId — раньше это приводило
// к тому, что leaveCurrentRoom выходил не из той комнаты).
function joinRoom(socket: Socket, roomId: number): void {
  const prevRoomId = socket.data.roomId as number | undefined;
  if (prevRoomId && prevRoomId !== roomId) {
    socket.leave(`room:${prevRoomId}`);
    removeTrackedRoom(socket, prevRoomId);
  }
  socket.data.roomId = roomId;
  addTrackedRoom(socket, roomId);
  socket.join(`room:${roomId}`);
}

// Выход сокета из всех игровых комнат room:* (включая комнаты, к которым
// он присоединился через join-player). Вызывается при leave-room с явным
// id и при master:auth без комнаты.
function leaveAllGameRooms(socket: Socket): void {
  const rooms = socket.rooms ?? new Set<string>();
  for (const room of Array.from(rooms)) {
    if (room.startsWith("room:")) socket.leave(room);
  }
  socket.data[ROOM_SET_KEY] = new Set<number>();
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
          // Мастер без комнаты (на странице списка) — выходим из всех комнат
          leaveAllGameRooms(socket);
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
        // Выход из комнаты (например, мастер на странице списка комнат).
        // Выходим из ВСЕХ игровых комнат, а не только из «последней»,
        // иначе сокет остаётся подписан на старые room:* и получает их
        // события после leaveRoom/logout.
        leaveAllGameRooms(socket);
        console.log(`Socket ${socket.id} вышел из комнаты`);
        return;
      }

      joinRoom(socket, roomId);
      console.log(`Socket ${socket.id} присоединился к комнате ${roomId}`);
      socket.emit("joined-room", { roomId });
    });

    // Явный выход из комнаты.
    // - payload без id (или с null) — выход из всех игровых комнат
    //   (полный logout клиента);
    // - payload с конкретным roomId — выход только из этой комнаты
    //   (переключение между комнатами), с очисткой отслеживаемого roomId,
    //   чтобы следующий join-room не «оставил» старую комнату.
    socket.on("leave-room", (payload: unknown) => {
      const raw =
        payload !== null && typeof payload === "object"
          ? (payload as { roomId?: unknown }).roomId
          : payload;
      const roomId = Number(raw);

      if (raw === null || raw === undefined || raw === "" || Number.isNaN(roomId)) {
        leaveAllGameRooms(socket);
        console.log(`Socket ${socket.id} покинул все комнаты`);
        return;
      }

      socket.leave(`room:${roomId}`);
      removeTrackedRoom(socket, roomId);
      if (socket.data.roomId === roomId) delete socket.data.roomId;
      console.log(`Socket ${socket.id} покинул комнату ${roomId}`);
    });

    // Подписка игрока на свою комнату (игрок передаёт playerId)
    socket.on("join-player", async (playerId: string) => {
      try {
        // Получаем игрока из БД, чтобы узнать room_id
        const player = await getFullPlayerData(playerId);
        if (player) {
          const roomId = player.room_id;
          socket.data.playerId = Number(playerId);
          // Не перезаписываем socket.data.roomId (это «комната мастера»):
          // подписка игрока добавляется отдельно и отслеживается через
          // socket.data[ROOM_SET_KEY], чтобы выход из одной комнаты не
          // «ронял» подписку на другую.
          addTrackedRoom(socket, roomId);
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

    // Явный выход игрока из его подписок (при logout игрока).
    // Выходим только из комнат, которые были добавлены join-player
    // (отслеживаемый Set), и из персональной комнаты player:<id>.
    socket.on("leave-player", () => {
      const playerId = socket.data.playerId as number | undefined;
      if (playerId) {
        socket.leave(`player:${playerId}`);
        delete socket.data.playerId;
      }
      const tracked = socket.data[ROOM_SET_KEY] as Set<number> | undefined;
      if (tracked) {
        for (const roomId of Array.from(tracked)) {
          socket.leave(`room:${roomId}`);
        }
        tracked.clear();
      }
      console.log(`Socket ${socket.id} вышел из игровых подписок`);
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

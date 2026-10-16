// client/src/lib/socket.ts
import { io, Socket } from "socket.io-client";
import { useRoomStore } from "../stores/roomStore";
import { SOCKET_URL } from "./config";
import {
  addMapSubscription,
  removeMapSubscription,
  getSubscribedMaps,
} from "./mapSubscriptions";

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
  // Если сокет был намеренно отключён (disconnect() отключает и
  // реконнект-механизм), штатный reconnect невозможен — реактивируем его.
  if (!s.connected && !s.active) {
    s.reconnect = true;
    s.connect();
  }
  return s;
}

/**
 * Выход из всех игровых подписок сокета.
 *
 * ВАЖНО: в socket.io-client v4 клиент НЕ хранит локальный список комнат
 * (`socket.rooms`/`socket.leave()` существуют только на серверной стороне),
 * поэтому выход выполняется серверными событиями (см. server/src/socket/index.ts):
 *  - `leave-room` без id  -> leaveAllGameRooms(): выход из всех `room:*`;
 *  - `leave-player`       -> выход из `player:<id>` и комнат, добавленных
 *                            join-player (отслеживаемый Set на сервере);
 *  - `leave-map(mapId)`   -> выход из `map:<id>` для каждой карты из
 *                            локального реестра подписок (его ведёт MapEditor).
 *
 * Используется при leaveRoom/logout мастера (stores/roomStore.ts), чтобы
 * сервер перестал слать этому клиенту события старой кампании — иначе
 * подписка «висит» до полного отключения соединения (утечка подписок).
 * Обработчики событий при этом снимаются отдельно — через
 * disconnectAllSocketHandlers().
 */
export function leaveAllRooms(): void {
  // Выходим из комнат только если соединение уже создавалось:
  // вызов getSocket() здесь поднял бы лишное WS-соединение у клиентов,
  // которые сокеты никогда не использовали (например, страница логина).
  if (!socketInstance) return;
  socketInstance.emit("leave-room", {});
  socketInstance.emit("leave-player", {});
  // Подписки на карты трекаются на клиенте — снимаем их все и очищаем реестр.
  for (const mapId of getSubscribedMaps()) {
    socketInstance.emit("leave-map", mapId);
    removeMapSubscription(mapId);
  }
}

export const socket = getSocket();

declare global {
  interface Window {
    __socket: typeof socket;
  }
}
window.__socket = socket;

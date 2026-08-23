// client/src/stores/mapStore.ts
import { create } from "zustand";
import { socket } from "../lib/socket";
import type {
  MapType,
  MapWithTokensType,
  MapTokenType,
  AvailableEntities,
} from "../types";

type RawToken = MapTokenType;

let mapSocketHandlers: {
  onConnect: () => void;
  onCreated: () => void;
  onUpdated: (updatedMap: MapType) => void;
  onDeleted: (deletedId: number) => void;
  onActiveChanged: (activeMapData: MapWithTokensType | null) => void;
  onTokensUpdated: (data: { mapId: number; tokens: RawToken[] }) => void;
  onActiveTokensUpdated: () => void;
} | null = null;
let mapSocketInitialized = false;

interface MapStore {
  maps: MapType[];
  activeMap: MapWithTokensType | null;
  currentMap: MapWithTokensType | null;
  loading: boolean;
  roomId: number | null;
  fetchMaps: () => Promise<void>;
  fetchMap: (id: number) => Promise<void>;
  fetchActiveMap: () => Promise<void>;
  createMap: (formData: FormData) => Promise<void>;
  updateMap: (
    id: number,
    data: { name?: string; show_to_players?: boolean },
  ) => Promise<void>;
  deleteMap: (id: number) => Promise<void>;
  setCurrentMap: (map: MapWithTokensType | null) => void;
  updateToken: (
    mapId: number,
    token: Partial<MapTokenType> & { entity_type: string; entity_id: number },
  ) => Promise<void>;
  deleteToken: (
    mapId: number,
    entity_type: string,
    entity_id: number,
  ) => Promise<void>;
  getAvailableEntities: () => Promise<AvailableEntities>;
  initializeSocket: () => void;
  disconnectSocket: () => void;
  setRoomId: (roomId: number | null) => void;
}

export const useMapStore = create<MapStore>((set, get) => ({
  maps: [],
  activeMap: null,
  currentMap: null,
  loading: false,
  roomId: null,

  initializeSocket: () => {
    if (mapSocketInitialized) return;
    mapSocketInitialized = true;

    const onConnect = () => {
      get().fetchMaps();
    };
    const onCreated = () => {
      get().fetchMaps();
    };
    const onUpdated = (updatedMap: MapType) => {
      get().fetchMaps();
      if (get().currentMap?.id === updatedMap.id) {
        get().fetchMap(updatedMap.id);
      }
    };
    const onDeleted = (deletedId: number) => {
      get().fetchMaps();
      if (get().currentMap?.id === deletedId) {
        set({ currentMap: null });
      }
    };
    const onActiveChanged = async (activeMapData: MapWithTokensType | null) => {
      console.log("[mapStore] map:active-changed received:", activeMapData);
      if (!activeMapData) {
        set({ activeMap: null });
        return;
      }
      await get().fetchActiveMap();
    };
    const onTokensUpdated = async ({
      mapId,
    }: {
      mapId: number;
      tokens: RawToken[];
    }) => {
      const numericMapId = Number(mapId);
      if (get().currentMap?.id === numericMapId) {
        await get().fetchMap(numericMapId);
      } else if (get().activeMap?.id === numericMapId) {
        await get().fetchActiveMap();
      }
    };
    const onActiveTokensUpdated = async () => {
      await get().fetchActiveMap();
    };

    socket.on("connect", onConnect);
    socket.on("map:created", onCreated);
    socket.on("map:updated", onUpdated);
    socket.on("map:deleted", onDeleted);
    socket.on("map:active-changed", onActiveChanged);
    socket.on("map:tokens-updated", onTokensUpdated);
    socket.on("map:active-tokens-updated", onActiveTokensUpdated);

    mapSocketHandlers = {
      onConnect,
      onCreated,
      onUpdated,
      onDeleted,
      onActiveChanged,
      onTokensUpdated,
      onActiveTokensUpdated,
    };

    const roomId = get().roomId;
    if (roomId !== null && roomId !== undefined) {
      socket.emit("join-room", { roomId });
    }
  },

  disconnectSocket: () => {
    if (!mapSocketInitialized || !mapSocketHandlers) return;
    const {
      onConnect,
      onCreated,
      onUpdated,
      onDeleted,
      onActiveChanged,
      onTokensUpdated,
      onActiveTokensUpdated,
    } = mapSocketHandlers;
    socket.off("connect", onConnect);
    socket.off("map:created", onCreated);
    socket.off("map:updated", onUpdated);
    socket.off("map:deleted", onDeleted);
    socket.off("map:active-changed", onActiveChanged);
    socket.off("map:tokens-updated", onTokensUpdated);
    socket.off("map:active-tokens-updated", onActiveTokensUpdated);
    mapSocketInitialized = false;
    mapSocketHandlers = null;
    console.log("MapStore socket handlers removed");
  },

  setRoomId: (roomId) => {
    set({ roomId });
    if (socket.connected) {
      socket.emit("join-room", { roomId });
    }
  },

  fetchMaps: async () => {
    try {
      const res = await fetch("/api/maps");
      if (res.ok) {
        const data = await res.json();
        set({ maps: data });
      }
    } catch (error) {
      console.error(error);
    }
  },

  fetchMap: async (id: number) => {
    try {
      const res = await fetch(`/api/maps/${id}`);
      if (res.ok) {
        const data = await res.json();
        set({ currentMap: data });
      }
    } catch (error) {
      console.error(error);
    }
  },

  fetchActiveMap: async () => {
    try {
      const res = await fetch("/api/maps/active");
      if (res.ok) {
        const data = await res.json();
        set({ activeMap: data });
      }
    } catch (error) {
      console.error(error);
    }
  },

  createMap: async (formData: FormData) => {
    const res = await fetch("/api/maps", { method: "POST", body: formData });
    if (!res.ok) throw new Error("Ошибка создания карты");
    await get().fetchMaps();
  },

  updateMap: async (id, data) => {
    const res = await fetch(`/api/maps/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Ошибка обновления карты");
    await get().fetchMaps();
    if (get().currentMap?.id === id) await get().fetchMap(id);
  },

  deleteMap: async (id) => {
    const res = await fetch(`/api/maps/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Ошибка удаления карты");
    await get().fetchMaps();
  },

  setCurrentMap: (map) => set({ currentMap: map }),

  updateToken: async (mapId, token) => {
    const res = await fetch(`/api/maps/${mapId}/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(token),
    });
    if (!res.ok) throw new Error("Ошибка обновления токена");
  },

  deleteToken: async (mapId, entity_type, entity_id) => {
    const res = await fetch(
      `/api/maps/${mapId}/tokens/${entity_type}/${entity_id}`,
      {
        method: "DELETE",
      },
    );
    if (!res.ok) throw new Error("Ошибка удаления токена");
  },

  getAvailableEntities: async () => {
    const res = await fetch("/api/maps/entities/available");
    if (!res.ok) throw new Error("Ошибка загрузки сущностей");
    return res.json();
  },
}));

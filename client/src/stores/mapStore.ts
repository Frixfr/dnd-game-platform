// client/src/stores/mapStore.ts
import { create } from "zustand";
import { socket } from "../lib/socket";
import type {
  MapType,
  MapWithTokensType,
  MapTokenType,
  AvailableEntities,
} from "../types";

interface MapStore {
  maps: MapType[];
  activeMap: MapWithTokensType | null;
  currentMap: MapWithTokensType | null;
  loading: boolean;
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
}

let mapSocketInitialized = false;

export const useMapStore = create<MapStore>((set, get) => ({
  maps: [],
  activeMap: null,
  currentMap: null,
  loading: false,

  initializeSocket: () => {
    if (mapSocketInitialized) return;
    mapSocketInitialized = true;

    socket.on("map:created", () => {
      get().fetchMaps();
    });
    socket.on("map:updated", (updatedMap) => {
      get().fetchMaps();
      if (get().currentMap?.id === updatedMap.id) {
        get().fetchMap(updatedMap.id);
      }
    });
    socket.on("map:deleted", (deletedId) => {
      get().fetchMaps();
      if (get().currentMap?.id === deletedId) {
        set({ currentMap: null });
      }
    });

    // Новый обработчик: при смене активной карты перезагружаем полные данные
    socket.on("map:active-changed", async (activeMapData) => {
      console.log("[mapStore] map:active-changed received:", activeMapData);
      try {
        // Если данные falsy (null, undefined) — карта скрыта
        if (!activeMapData) {
          console.log("[mapStore] Активная карта скрыта, устанавливаем null");
          set({ activeMap: null });
          return;
        }

        // Если данные есть — загружаем полную карту с токенами
        console.log("[mapStore] Загружаем полные данные активной карты");
        await get().fetchActiveMap();
      } catch (error) {
        console.error(
          "[mapStore] Ошибка при обработке map:active-changed:",
          error,
        );
      }
    });

    // Обработчик обновления токенов
    socket.on("map:tokens-updated", async ({ mapId, tokens }) => {
      const numericMapId = Number(mapId);

      // Принудительная перезагрузка карты, если это текущая карта
      if (get().currentMap?.id === numericMapId) {
        await get().fetchMap(numericMapId);
      } else {
        // Если не текущая, просто обновляем стейт
        set((state) => {
          if (state.currentMap && state.currentMap.id === numericMapId) {
            return { currentMap: { ...state.currentMap, tokens } };
          }
          if (state.activeMap && state.activeMap.id === numericMapId) {
            return { activeMap: { ...state.activeMap, tokens } };
          }
          return {};
        });
      }
    });

    socket.on("map:active-tokens-updated", (tokens) => {
      set((state) => ({
        activeMap: state.activeMap ? { ...state.activeMap, tokens } : null,
      }));
    });
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
      } else {
        console.error("[mapStore] fetchMap failed with status", res.status);
      }
    } catch (error) {
      console.error("[mapStore] fetchMap error", error);
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

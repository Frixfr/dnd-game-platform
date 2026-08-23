// server/src/services/mapsService.ts
import { db } from "../db/index.js";
import sharp from "sharp";
import type {
  Map,
  MapToken,
  CreateMapDto,
  UpdateMapDto,
  UpdateTokenDto,
} from "../types/index.js";

export const mapsService = {
  // --- Карты ---
  // ADDED roomId support
  async getAllMaps(roomId: number): Promise<Map[]> {
    return db("maps").where("room_id", roomId).orderBy("created_at", "desc");
  },

  // ADDED roomId support
  async getMapById(roomId: number, id: number): Promise<Map | undefined> {
    return db("maps").where({ id, room_id: roomId }).first();
  },

  // ADDED roomId support
  async createMap(
    roomId: number,
    data: CreateMapDto,
    imageUrl: string,
    filePath: string,
  ): Promise<Map> {
    const metadata = await sharp(filePath).metadata();
    const original_width = metadata.width || 0;
    const original_height = metadata.height || 0;

    const [map] = await db("maps")
      .insert({
        name: data.name,
        image_url: imageUrl,
        show_to_players: data.show_to_players ?? false,
        original_width,
        original_height,
        room_id: roomId, // ADDED
        updated_at: db.fn.now(),
      })
      .returning("*");
    return map;
  },

  // ADDED roomId support
  async updateMap(
    roomId: number,
    id: number,
    data: UpdateMapDto,
  ): Promise<Map | undefined> {
    // Проверяем, что карта принадлежит комнате
    const existing = await db("maps").where({ id, room_id: roomId }).first();
    if (!existing) return undefined;

    const [updated] = await db("maps")
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning("*");
    return updated;
  },

  // ADDED roomId support
  async deleteMap(roomId: number, id: number): Promise<void> {
    await db("maps").where({ id, room_id: roomId }).del();
  },

  // ADDED roomId support
  async setShowToPlayers(
    roomId: number,
    id: number,
    show: boolean,
  ): Promise<void> {
    // Проверяем, что карта принадлежит комнате
    const existing = await db("maps").where({ id, room_id: roomId }).first();
    if (!existing) return;

    // Снимаем флаг со всех остальных карт в этой комнате, если show = true
    if (show) {
      await db("maps")
        .where("room_id", roomId)
        .update({ show_to_players: false })
        .whereNot({ id });
    }
    await db("maps")
      .where({ id })
      .update({ show_to_players: show, updated_at: db.fn.now() });
  },

  // ADDED roomId support
  async getActiveMapForPlayers(roomId: number): Promise<Map | undefined> {
    return db("maps").where({ room_id: roomId, show_to_players: true }).first();
  },

  // --- Токены ---
  // ADDED roomId support
  async getTokensByMapId(
    roomId: number,
    mapId: number,
  ): Promise<
    (MapToken & { entity_name: string; avatar_url?: string | null })[]
  > {
    // Проверяем, что карта принадлежит комнате
    const map = await db("maps").where({ id: mapId, room_id: roomId }).first();
    if (!map) return [];

    const tokens = await db("map_tokens")
      .where({ map_id: mapId })
      .orderBy("entity_type", "asc")
      .orderBy("entity_id", "asc");

    const result = [];
    for (const token of tokens) {
      let entity: any = null;
      if (token.entity_type === "player") {
        entity = await db("players")
          .select("name", "avatar_url")
          .where({ id: token.entity_id, room_id: roomId }) // фильтруем игрока по комнате
          .first();
      } else {
        entity = await db("npcs")
          .select("name", "avatar_url")
          .where({ id: token.entity_id, room_id: roomId }) // фильтруем NPC по комнате
          .first();
      }
      result.push({
        ...token,
        entity_name: entity?.name || "Unknown",
        avatar_url: entity?.avatar_url || null,
      });
    }
    return result;
  },

  // ADDED roomId support
  async addOrUpdateToken(
    roomId: number,
    mapId: number,
    entityType: "player" | "npc",
    entityId: number,
    data: UpdateTokenDto,
  ): Promise<MapToken> {
    // Проверяем, что карта принадлежит комнате
    const map = await db("maps").where({ id: mapId, room_id: roomId }).first();
    if (!map) throw new Error("Карта не найдена или не принадлежит комнате");

    // Проверяем, что сущность принадлежит комнате
    if (entityType === "player") {
      const player = await db("players")
        .where({ id: entityId, room_id: roomId })
        .first();
      if (!player)
        throw new Error("Игрок не найден или не принадлежит комнате");
    } else {
      const npc = await db("npcs")
        .where({ id: entityId, room_id: roomId })
        .first();
      if (!npc) throw new Error("NPC не найден или не принадлежит комнате");
    }

    const existing = await db("map_tokens")
      .where({ map_id: mapId, entity_type: entityType, entity_id: entityId })
      .first();
    if (existing) {
      const [updated] = await db("map_tokens")
        .where({ id: existing.id })
        .update({
          x: data.x ?? existing.x,
          y: data.y ?? existing.y,
          is_grayscale: data.is_grayscale ?? existing.is_grayscale,
          scale: data.scale ?? existing.scale,
          updated_at: db.fn.now(),
        })
        .returning("*");
      return updated;
    } else {
      const [token] = await db("map_tokens")
        .insert({
          map_id: mapId,
          entity_type: entityType,
          entity_id: entityId,
          x: data.x ?? 0,
          y: data.y ?? 0,
          is_grayscale: data.is_grayscale ?? false,
          scale: data.scale ?? 1,
          updated_at: db.fn.now(),
        })
        .returning("*");
      return token;
    }
  },

  // ADDED roomId support
  async deleteToken(
    roomId: number,
    mapId: number,
    entityType: "player" | "npc",
    entityId: number,
  ): Promise<void> {
    // Проверяем, что карта принадлежит комнате
    const map = await db("maps").where({ id: mapId, room_id: roomId }).first();
    if (!map) throw new Error("Карта не найдена или не принадлежит комнате");

    await db("map_tokens")
      .where({ map_id: mapId, entity_type: entityType, entity_id: entityId })
      .del();
  },

  // ADDED roomId support
  async getAvailableEntities(roomId: number): Promise<{
    players: { id: number; name: string; avatar_url?: string | null }[];
    npcs: { id: number; name: string; avatar_url?: string | null }[];
  }> {
    const players = await db("players")
      .select("id", "name", "avatar_url")
      .where("room_id", roomId);
    const npcs = await db("npcs")
      .select("id", "name", "avatar_url")
      .where("room_id", roomId);
    return { players, npcs };
  },
};

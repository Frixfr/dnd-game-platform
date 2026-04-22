// server/src/services/mapsService.ts
import { db } from "../db/index.js";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import type {
  Map,
  MapToken,
  CreateMapDto,
  UpdateMapDto,
  UpdateTokenDto,
} from "../types/index.js";

export const mapsService = {
  // --- Карты ---
  async getAllMaps(): Promise<Map[]> {
    return db("maps").orderBy("created_at", "desc");
  },

  async getMapById(id: number): Promise<Map | undefined> {
    return db("maps").where({ id }).first();
  },

  async createMap(
    data: CreateMapDto,
    imageUrl: string,
    filePath: string,
  ): Promise<Map> {
    // Получаем размеры изображения через sharp
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
        updated_at: db.fn.now(),
      })
      .returning("*");
    return map;
  },

  async updateMap(id: number, data: UpdateMapDto): Promise<Map | undefined> {
    const [updated] = await db("maps")
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning("*");
    return updated;
  },

  async deleteMap(id: number): Promise<void> {
    await db("maps").where({ id }).del();
  },

  async setShowToPlayers(id: number, show: boolean): Promise<void> {
    // Снимаем флаг со всех остальных карт, если show = true
    if (show) {
      await db("maps").update({ show_to_players: false }).whereNot({ id });
    }
    await db("maps")
      .where({ id })
      .update({ show_to_players: show, updated_at: db.fn.now() });
  },

  async getActiveMapForPlayers(): Promise<Map | undefined> {
    return db("maps").where({ show_to_players: true }).first();
  },

  // --- Токены ---
  async getTokensByMapId(
    mapId: number,
  ): Promise<
    (MapToken & { entity_name: string; avatar_url?: string | null })[]
  > {
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
          .where({ id: token.entity_id })
          .first();
      } else {
        entity = await db("npcs")
          .select("name", "avatar_url")
          .where({ id: token.entity_id })
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

  async addOrUpdateToken(
    mapId: number,
    entityType: "player" | "npc",
    entityId: number,
    data: UpdateTokenDto,
  ): Promise<MapToken> {
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

  async deleteToken(
    mapId: number,
    entityType: "player" | "npc",
    entityId: number,
  ): Promise<void> {
    await db("map_tokens")
      .where({ map_id: mapId, entity_type: entityType, entity_id: entityId })
      .del();
  },

  async getAvailableEntities(): Promise<{
    players: { id: number; name: string; avatar_url?: string | null }[];
    npcs: { id: number; name: string; avatar_url?: string | null }[];
  }> {
    const players = await db("players").select("id", "name", "avatar_url");
    const npcs = await db("npcs").select("id", "name", "avatar_url");
    return { players, npcs };
  },
};

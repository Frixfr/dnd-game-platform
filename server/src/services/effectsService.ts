// Файл: server/src/services/effectsService.ts
import { db } from "../db/index.js";
import type { Effect, PaginatedResponse } from "../types/index.js";

function parseTags(effect: any): Effect {
  if (effect && effect.tags) {
    try {
      effect.tags = JSON.parse(effect.tags);
    } catch {
      effect.tags = [];
    }
  } else if (effect) {
    effect.tags = [];
  }
  return effect;
}

export const effectsService = {
  // ADDED roomId support
  async getAll(
    roomId: number,
    page?: number,
    limit?: number,
  ): Promise<Effect[] | PaginatedResponse<Effect>> {
    let query = db("effects").select("*").where("room_id", roomId); // ADDED filter

    if (page === undefined || limit === undefined) {
      const effects = await query;
      return effects.map(parseTags);
    }

    const offset = (page - 1) * limit;
    const totalQuery = query
      .clone()
      .clearSelect()
      .clearOrder()
      .count("id as count")
      .first();
    const totalResult = await totalQuery;
    const total = Number(totalResult?.count) || 0;

    const dataRaw = await query.limit(limit).offset(offset);
    const data = dataRaw.map(parseTags);
    return { data, total, page, limit };
  },

  // ADDED roomId support
  async getById(roomId: number, id: string): Promise<Effect | null> {
    const effect = await db("effects").where({ id, room_id: roomId }).first(); // ADDED room_id check
    return effect ? parseTags(effect) : null;
  },

  // ADDED roomId support
  async create(
    roomId: number,
    data: Omit<Effect, "id" | "room_id">,
  ): Promise<Effect> {
    const insertData: any = { ...data, room_id: roomId }; // ADDED room_id
    if (insertData.tags) {
      insertData.tags = JSON.stringify(insertData.tags);
    } else {
      insertData.tags = "[]";
    }
    const [effect] = await db("effects").insert(insertData).returning("*");
    return parseTags(effect);
  },

  // ADDED roomId support
  async update(
    roomId: number,
    id: string,
    data: Partial<Omit<Effect, "id" | "room_id">>,
  ): Promise<Effect | null> {
    // Проверяем, что эффект принадлежит комнате
    const existing = await db("effects").where({ id, room_id: roomId }).first();
    if (!existing) return null;

    const updateData: any = { ...data };
    if (updateData.tags !== undefined) {
      updateData.tags = JSON.stringify(updateData.tags);
    }
    const [updated] = await db("effects")
      .where({ id })
      .update(updateData)
      .returning("*");
    return updated ? parseTags(updated) : null;
  },

  // ADDED roomId support
  async delete(roomId: number, id: string): Promise<boolean> {
    // Проверяем, что эффект принадлежит комнате
    const effect = await db("effects").where({ id, room_id: roomId }).first();
    if (!effect) return false;

    // Проверка использования в способностях
    const usedInAbility = await db("abilities").where("effect_id", id).first();
    if (usedInAbility) throw new Error("Effect is in use");
    // Проверка использования в предметах (активный или пассивный эффект)
    const usedInItemActive = await db("items")
      .where("active_effect_id", id)
      .first();
    if (usedInItemActive) throw new Error("Effect is in use");
    const usedInItemPassive = await db("items")
      .where("passive_effect_id", id)
      .first();
    if (usedInItemPassive) throw new Error("Effect is in use");
    // Проверка использования в активных эффектах игроков
    const usedInPlayerEffect = await db("player_active_effects")
      .where("effect_id", id)
      .first();
    if (usedInPlayerEffect) throw new Error("Effect is in use");
    // Проверка использования в активных эффектах NPC
    const usedInNpcEffect = await db("npc_active_effects")
      .where("effect_id", id)
      .first();
    if (usedInNpcEffect) throw new Error("Effect is in use");
    // Проверка использования в расах (через race_effects)
    const usedInRace = await db("race_effects").where("effect_id", id).first();
    if (usedInRace) throw new Error("Effect is in use");

    const deleted = await db("effects").where({ id }).delete();
    return deleted > 0;
  },
};

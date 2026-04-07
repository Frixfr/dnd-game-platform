// Файл: server/src/services/effectsService.ts (полностью)
import { db } from "../db/index.js";
import type { Effect } from "../types/index.js";

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
  async getAll(): Promise<Effect[]> {
    const effects = await db("effects").select("*");
    return effects.map(parseTags);
  },

  async getById(id: string): Promise<Effect | null> {
    const effect = await db("effects").where({ id }).first();
    return effect ? parseTags(effect) : null;
  },

  async create(data: Omit<Effect, "id">): Promise<Effect> {
    const insertData: any = { ...data };
    if (insertData.tags) {
      insertData.tags = JSON.stringify(insertData.tags);
    } else {
      insertData.tags = "[]";
    }
    const [effect] = await db("effects").insert(insertData).returning("*");
    return parseTags(effect);
  },

  async update(id: string, data: Partial<Effect>): Promise<Effect | null> {
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

  async delete(id: string): Promise<boolean> {
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

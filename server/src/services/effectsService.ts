import { db } from "../db/index.js";
import type { Effect } from "../types/index.js";

export const effectsService = {
  async getAll(): Promise<Effect[]> {
    return db("effects").select("*");
  },

  async getById(id: string): Promise<Effect | null> {
    return db("effects").where({ id }).first();
  },

  async create(data: Omit<Effect, "id">): Promise<Effect> {
    const [effect] = await db("effects").insert(data).returning("*");
    return effect;
  },

  async update(id: string, data: Partial<Effect>): Promise<Effect | null> {
    const [updated] = await db("effects")
      .where({ id })
      .update(data)
      .returning("*");
    return updated || null;
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

    const deleted = await db("effects").where({ id }).delete();
    return deleted > 0;
  },
};

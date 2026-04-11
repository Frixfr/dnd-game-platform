import { db } from "../db/index.js";
import type { Ability } from "../types/index.js";

export const abilitiesService = {
  async getAll(): Promise<Ability[]> {
    return db("abilities").select("*");
  },

  async getById(id: string): Promise<Ability | null> {
    return db("abilities").where({ id }).first();
  },

  async create(
    data: Omit<Ability, "id" | "created_at" | "updated_at">,
  ): Promise<Ability> {
    const now = db.fn.now();
    const [ability] = await db("abilities")
      .insert({ ...data, created_at: now, updated_at: now })
      .returning("*");
    return ability;
  },

  async update(
    id: string,
    data: Partial<Omit<Ability, "id" | "created_at">>,
  ): Promise<Ability | null> {
    const [updated] = await db("abilities")
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning("*");
    return updated || null;
  },

  async delete(id: string): Promise<boolean> {
    const usedByPlayer = await db("player_abilities")
      .where("ability_id", id)
      .first();
    if (usedByPlayer) throw new Error("Ability is in use");

    const usedByNpc = await db("npc_abilities").where("ability_id", id).first();
    if (usedByNpc) throw new Error("Ability is in use");

    const deleted = await db("abilities").where({ id }).delete();
    return deleted > 0;
  },

  async checkEffectExists(effectId: number): Promise<boolean> {
    const effect = await db("effects").where("id", effectId).first();
    return !!effect;
  },
};

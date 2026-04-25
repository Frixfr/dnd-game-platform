// server/src/services/racesService.ts

import { db } from "../db/index.js";
import type { Race } from "../types/index.js";
import { emitPlayerUpdate, emitNpcUpdate } from "../socket/index.js";

export const racesService = {
  async getAll(): Promise<(Race & { effects: any[] })[]> {
    const races = await db("races").select("*");
    if (races.length === 0) return races;

    const raceIds = races.map((r) => r.id);
    const effectsMap: Record<number, any[]> = {};

    const raceEffects = await db("race_effects")
      .whereIn("race_id", raceIds)
      .join("effects", "race_effects.effect_id", "effects.id")
      .select("race_effects.race_id", "effects.*");

    for (const re of raceEffects) {
      if (!effectsMap[re.race_id]) effectsMap[re.race_id] = [];
      effectsMap[re.race_id].push(re);
    }

    return races.map((race) => ({
      ...race,
      effects: effectsMap[race.id] || [],
    }));
  },

  async getById(id: string): Promise<Race | null> {
    return db("races").where({ id }).first();
  },

  async getWithEffects(
    id: string,
  ): Promise<(Race & { effects: any[] }) | null> {
    const race = await db("races").where({ id }).first();
    if (!race) return null;
    const effects = await db("race_effects")
      .where("race_id", id)
      .join("effects", "race_effects.effect_id", "effects.id")
      .select("effects.*");
    return { ...race, effects };
  },

  async create(
    data: Omit<Race, "id" | "created_at">,
    effectIds: number[] = [],
  ): Promise<Race> {
    const [race] = await db("races").insert(data).returning("*");
    if (effectIds.length) {
      const raceEffects = effectIds.map((effect_id) => ({
        race_id: race.id,
        effect_id,
      }));
      await db("race_effects").insert(raceEffects);
    }
    return race;
  },

  async update(
    id: string,
    data: Partial<Race>,
    effectIds?: number[],
  ): Promise<Race | null> {
    if (effectIds !== undefined && effectIds.length > 0) {
      const existingEffects = await db("effects")
        .whereIn("id", effectIds)
        .select("id");
      const foundIds = existingEffects.map((e: any) => e.id);
      const missingIds = effectIds.filter((eid) => !foundIds.includes(eid));
      if (missingIds.length > 0) {
        throw new Error(`Effect with id ${missingIds.join(", ")} not found`);
      }
    }

    const [updated] = await db("races")
      .where({ id })
      .update(data)
      .returning("*");

    if (updated && effectIds !== undefined) {
      await db("race_effects").where("race_id", id).delete();
      if (effectIds.length) {
        const raceEffects = effectIds.map((effect_id) => ({
          race_id: parseInt(id),
          effect_id,
        }));
        await db("race_effects").insert(raceEffects);
      }

      // Обновляем всех игроков и NPC, у которых эта раса
      const players = await db("players").where("race_id", id).select("id");
      for (const p of players) {
        await emitPlayerUpdate(p.id);
      }
      const npcs = await db("npcs").where("race_id", id).select("id");
      for (const n of npcs) {
        await emitNpcUpdate(n.id);
      }
    }
    return updated || null;
  },

  async delete(id: string): Promise<boolean> {
    const usedByPlayer = await db("players").where("race_id", id).first();
    if (usedByPlayer) throw new Error("Race is used by players");
    const usedByNpc = await db("npcs").where("race_id", id).first();
    if (usedByNpc) throw new Error("Race is used by NPCs");
    const deleted = await db("races").where({ id }).delete();
    return deleted > 0;
  },
};

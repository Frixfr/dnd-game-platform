import { db } from "../db/index.js";
import type { Race } from "../types/index.js";

export const racesService = {
  async getAll(): Promise<Race[]> {
    return db("races").select("*");
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
    // Валидация существования эффектов
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
      // Обновляем связи с эффектами
      await db("race_effects").where("race_id", id).delete();
      if (effectIds.length) {
        const raceEffects = effectIds.map((effect_id) => ({
          race_id: parseInt(id),
          effect_id,
        }));
        await db("race_effects").insert(raceEffects);
      }
    }
    return updated || null;
  },

  async delete(id: string): Promise<boolean> {
    // Проверка использования в players или npcs
    const usedByPlayer = await db("players").where("race_id", id).first();
    if (usedByPlayer) throw new Error("Race is used by players");
    const usedByNpc = await db("npcs").where("race_id", id).first();
    if (usedByNpc) throw new Error("Race is used by NPCs");
    const deleted = await db("races").where({ id }).delete();
    return deleted > 0;
  },
};

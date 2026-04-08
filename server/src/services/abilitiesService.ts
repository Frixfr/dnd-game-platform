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
    // Проверка использования игроками
    const usedByPlayer = await db("player_abilities")
      .where("ability_id", id)
      .first();
    if (usedByPlayer) throw new Error("Ability is in use");
    // Проверка использования NPC
    const usedByNpc = await db("npc_abilities").where("ability_id", id).first();
    if (usedByNpc) throw new Error("Ability is in use");

    const deleted = await db("abilities").where({ id }).delete();
    return deleted > 0;
  },

  async checkEffectExists(effectId: number): Promise<boolean> {
    const effect = await db("effects").where("id", effectId).first();
    return !!effect;
  },

  async useAbility(
    playerId: number,
    abilityId: number,
  ): Promise<{ success: boolean; message: string; effect_applied?: boolean }> {
    // 1. Проверить существование способности
    const ability = await db("abilities").where({ id: abilityId }).first();
    if (!ability) throw new Error("Ability not found");
    if (ability.ability_type !== "active")
      throw new Error("Only active abilities can be used");

    // 2. Проверить связь игрока с этой способностью
    const playerAbility = await db("player_abilities")
      .where({ player_id: playerId, ability_id: abilityId })
      .first();
    if (!playerAbility) throw new Error("Player does not have this ability");
    if (!playerAbility.is_active) throw new Error("Ability is not active");

    // 3. Проверить откат: если есть колбэки на ходы/дни, нужно их уменьшать.
    //    В текущей реализации нет таблицы для отслеживания оставшегося отката.
    //    Создадим простую проверку: если в player_active_effects есть эффект с source_type='cooldown', то нельзя.
    //    Более продвинутое решение: добавить колонку last_used_at в player_abilities.
    //    Для простоты пока пропустим проверку отката, но оставим заглушку.

    // 4. Применить эффект способности (если есть)
    let effect_applied = false;
    if (ability.effect_id) {
      const effect = await db("effects")
        .where({ id: ability.effect_id })
        .first();
      if (effect) {
        // Добавить эффект в player_active_effects
        await db("player_active_effects").insert({
          player_id: playerId,
          effect_id: ability.effect_id,
          source_type: "ability",
          source_id: abilityId,
          remaining_turns: effect.duration_turns,
          remaining_days: effect.duration_days,
          applied_at: db.fn.now(),
        });
        effect_applied = true;
      }
    }

    // 5. Установить откат (добавить запись о том, что способность использована)
    //    Можно добавить запись в отдельную таблицу cooldowns или просто установить время последнего использования.
    //    Здесь для простоты не реализуем, но оставим комментарий.

    return {
      success: true,
      message: "Ability used successfully",
      effect_applied,
    };
  },
};

import { db } from "../db/index.js";
import type { Ability, PaginatedResponse } from "../types/index.js";
import { getFullPlayerData, getFullNpcData } from "../utils/helpers.js";
import { getIO } from "../socket/index.js";

export const abilitiesService = {
  async getAll(
    page?: number,
    limit?: number,
  ): Promise<Ability[] | PaginatedResponse<Ability>> {
    let query = db("abilities").select("*");

    if (page === undefined || limit === undefined) {
      return query;
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

    const data = await query.limit(limit).offset(offset);
    return { data, total, page, limit };
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
    // 1. Получаем старую версию способности до обновления
    const oldAbility = await db("abilities").where({ id }).first();
    if (!oldAbility) return null;

    // 2. Обновляем способность
    const [updated] = await db("abilities")
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning("*");
    if (!updated) return null;

    // 3. Проверяем, нужно ли синхронизировать пассивные эффекты:
    //    - Способность была/стала пассивной
    //    - Изменился effect_id
    const wasPassive = oldAbility.ability_type === "passive";
    const isPassive = updated.ability_type === "passive";
    const effectChanged = oldAbility.effect_id !== updated.effect_id;

    if ((wasPassive || isPassive) && effectChanged) {
      // 4. Синхронизация для игроков
      const playerLinks = await db("player_abilities")
        .where({ ability_id: id, is_active: true })
        .select("player_id");

      for (const { player_id } of playerLinks) {
        // Удаляем старый эффект, связанный со способностью
        await db("player_active_effects")
          .where({
            player_id,
            source_type: "ability",
            source_id: id,
          })
          .delete();

        // Если способность теперь пассивная и у неё есть эффект — создаём новый
        if (isPassive && updated.effect_id) {
          const effect = await db("effects")
            .where("id", updated.effect_id)
            .first();
          if (effect) {
            await db("player_active_effects").insert({
              player_id,
              effect_id: updated.effect_id,
              source_type: "ability",
              source_id: id,
              remaining_turns: effect.duration_turns,
              remaining_days: effect.duration_days,
              applied_at: db.fn.now(),
            });
          }
        }

        // Отправляем обновлённые данные игрока через сокет
        const fullPlayer = await getFullPlayerData(player_id);
        if (fullPlayer) {
          getIO().emit("player:updated", fullPlayer);
        }
      }

      // 5. Синхронизация для NPC (аналогично)
      const npcLinks = await db("npc_abilities")
        .where({ ability_id: id, is_active: true })
        .select("npc_id");

      for (const { npc_id } of npcLinks) {
        await db("npc_active_effects")
          .where({
            npc_id,
            source_type: "ability",
            source_id: id,
          })
          .delete();

        if (isPassive && updated.effect_id) {
          const effect = await db("effects")
            .where("id", updated.effect_id)
            .first();
          if (effect) {
            await db("npc_active_effects").insert({
              npc_id,
              effect_id: updated.effect_id,
              source_type: "ability",
              source_id: id,
              remaining_turns: effect.duration_turns,
              remaining_days: effect.duration_days,
              applied_at: db.fn.now(),
            });
          }
        }

        const fullNpc = await getFullNpcData(npc_id);
        if (fullNpc) {
          getIO().emit("npc:updated", fullNpc);
        }
      }
    }

    return updated;
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

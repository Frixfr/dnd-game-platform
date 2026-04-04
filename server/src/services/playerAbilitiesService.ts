import { db } from "../db/index.js";

export const playerAbilitiesService = {
  async getAll(filters: {
    player_id?: number;
    ability_id?: number;
    is_active?: boolean;
    with_details?: boolean;
  }) {
    let query = db("player_abilities").select("*");
    if (filters.player_id) query = query.where("player_id", filters.player_id);
    if (filters.ability_id)
      query = query.where("ability_id", filters.ability_id);
    if (filters.is_active !== undefined)
      query = query.where("is_active", filters.is_active);
    const rows = await query.orderBy("obtained_at", "desc");

    if (filters.with_details) {
      for (const row of rows) {
        row.player = await db("players").where("id", row.player_id).first();
        row.ability = await db("abilities").where("id", row.ability_id).first();
      }
    }
    return rows;
  },

  async create(player_id: number, ability_id: number, is_active: boolean) {
    // Проверка существования игрока и способности
    const player = await db("players").where("id", player_id).first();
    if (!player) throw new Error("Player not found");
    const ability = await db("abilities").where("id", ability_id).first();
    if (!ability) throw new Error("Ability not found");

    const existing = await db("player_abilities")
      .where({ player_id, ability_id })
      .first();

    let result;
    if (existing) {
      // Обновляем существующую запись
      const [updated] = await db("player_abilities")
        .where({ player_id, ability_id })
        .update({ is_active, obtained_at: db.fn.now() })
        .returning("*");
      result = updated;
    } else {
      const [newLink] = await db("player_abilities")
        .insert({ player_id, ability_id, is_active, obtained_at: db.fn.now() })
        .returning("*");
      result = newLink;
    }

    // --- Логика для пассивных способностей: автоматически создать/обновить активный эффект ---
    if (ability.ability_type === "passive" && ability.effect_id && is_active) {
      // Получаем эффект способности
      const effect = await db("effects").where("id", ability.effect_id).first();
      if (effect) {
        // Проверяем, есть ли уже активный эффект от этой способности
        const existingEffect = await db("player_active_effects")
          .where({
            player_id,
            effect_id: ability.effect_id,
            source_type: "ability",
            source_id: ability_id,
          })
          .first();

        const remaining_turns = effect.duration_turns;
        const remaining_days = effect.duration_days;

        if (existingEffect) {
          // Обновляем длительность (если эффект не перманентный)
          await db("player_active_effects")
            .where({ id: existingEffect.id })
            .update({
              remaining_turns,
              remaining_days,
              applied_at: db.fn.now(),
            });
        } else {
          // Создаём новый активный эффект
          await db("player_active_effects").insert({
            player_id,
            effect_id: ability.effect_id,
            source_type: "ability",
            source_id: ability_id,
            remaining_turns,
            remaining_days,
            applied_at: db.fn.now(),
          });
        }
      }
    } else if (ability.ability_type === "passive" && !is_active) {
      // Если способность пассивная, но is_active=false — удаляем эффект
      await db("player_active_effects")
        .where({
          player_id,
          source_type: "ability",
          source_id: ability_id,
        })
        .delete();
    }
    // --- Конец логики для пассивных способностей ---

    return result;
  },

  async delete(player_id: number, ability_id: number) {
    // Перед удалением связи получаем информацию о способности
    const ability = await db("abilities").where("id", ability_id).first();

    const deleted = await db("player_abilities")
      .where({ player_id, ability_id })
      .delete();
    if (deleted === 0) throw new Error("Not found");

    // Если способность пассивная — удаляем связанный активный эффект
    if (ability && ability.ability_type === "passive") {
      await db("player_active_effects")
        .where({
          player_id,
          source_type: "ability",
          source_id: ability_id,
        })
        .delete();
    }

    return true;
  },
};

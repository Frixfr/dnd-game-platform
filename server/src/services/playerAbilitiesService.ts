import { db } from "../db/index.js";
import { logsService } from "./logsService.js";
import { getFullPlayerData } from "../utils/helpers.js"; // ← добавить
import { getIO } from "../socket/index.js"; // ← добавить

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
    const player = await db("players").where("id", player_id).first();
    if (!player) throw new Error("Player not found");
    const ability = await db("abilities").where("id", ability_id).first();
    if (!ability) throw new Error("Ability not found");

    const existing = await db("player_abilities")
      .where({ player_id, ability_id })
      .first();

    let result;
    if (existing) {
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

    // Логика для пассивных способностей (создание/удаление эффекта у игрока)
    if (ability.ability_type === "passive" && ability.effect_id && is_active) {
      const effect = await db("effects").where("id", ability.effect_id).first();
      if (effect) {
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
          await db("player_active_effects")
            .where({ id: existingEffect.id })
            .update({
              remaining_turns,
              remaining_days,
              applied_at: db.fn.now(),
            });
        } else {
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
      await db("player_active_effects")
        .where({ player_id, source_type: "ability", source_id: ability_id })
        .delete();
    }

    return result;
  },

  async delete(player_id: number, ability_id: number) {
    const ability = await db("abilities").where("id", ability_id).first();
    const deleted = await db("player_abilities")
      .where({ player_id, ability_id })
      .delete();
    if (deleted === 0) throw new Error("Not found");
    if (ability && ability.ability_type === "passive") {
      await db("player_active_effects")
        .where({ player_id, source_type: "ability", source_id: ability_id })
        .delete();
    }
    return true;
  },

  async toggleActive(
    player_id: number,
    ability_id: number,
    is_active: boolean,
  ) {
    const ability = await db("abilities").where("id", ability_id).first();
    if (!ability) throw new Error("Ability not found");
    const [updated] = await db("player_abilities")
      .where({ player_id, ability_id })
      .update({ is_active })
      .returning("*");
    if (!updated) throw new Error("Player ability not found");

    // Обновляем пассивный эффект при переключении активности
    if (ability.ability_type === "passive" && ability.effect_id) {
      if (is_active) {
        const effect = await db("effects")
          .where("id", ability.effect_id)
          .first();
        if (effect) {
          const existing = await db("player_active_effects")
            .where({
              player_id,
              effect_id: ability.effect_id,
              source_type: "ability",
              source_id: ability_id,
            })
            .first();
          if (!existing) {
            await db("player_active_effects").insert({
              player_id,
              effect_id: ability.effect_id,
              source_type: "ability",
              source_id: ability_id,
              remaining_turns: effect.duration_turns,
              remaining_days: effect.duration_days,
            });
          }
        }
      } else {
        await db("player_active_effects")
          .where({ player_id, source_type: "ability", source_id: ability_id })
          .delete();
      }
    }
    return updated;
  },

  async useAbility(
    playerId: number,
    abilityId: number,
  ): Promise<{ success: boolean; message: string; effect?: any }> {
    const playerAbility = await db("player_abilities")
      .where({ player_id: playerId, ability_id: abilityId })
      .first();
    if (!playerAbility) throw new Error("Способность не найдена у игрока");
    if (!playerAbility.is_active) throw new Error("Способность неактивна");

    const ability = await db("abilities").where({ id: abilityId }).first();
    if (!ability) throw new Error("Способность не найдена");
    if (ability.ability_type !== "active")
      throw new Error("Можно использовать только активные способности");

    // Проверка кулдауна
    const remainingCooldown = playerAbility.remaining_cooldown_turns || 0;
    if (remainingCooldown > 0) {
      throw new Error(
        `Способность на перезарядке: осталось ${remainingCooldown} ходов`,
      );
    }

    // Применяем эффект способности (если есть)
    let effectResult = null;
    if (ability.effect_id) {
      const effect = await db("effects")
        .where({ id: ability.effect_id })
        .first();
      if (effect) {
        await db("player_active_effects").insert({
          player_id: playerId,
          effect_id: ability.effect_id,
          source_type: "ability",
          source_id: abilityId,
          remaining_turns: effect.duration_turns,
          remaining_days: effect.duration_days,
        });
        effectResult = effect;
      }
    }

    // Устанавливаем кулдаун
    await db("player_abilities")
      .where({ player_id: playerId, ability_id: abilityId })
      .update({ remaining_cooldown_turns: ability.cooldown_turns });

    // Логирование
    const player = await db("players").where({ id: playerId }).first();
    if (player) {
      await logsService.create({
        action_type: "ability_use",
        player_id: playerId,
        npc_id: null,
        entity_name: player.name,
        action_name: ability.name,
        details: JSON.stringify({
          ability_id: abilityId,
          cooldown: ability.cooldown_turns,
        }),
      });
    }

    // === НОВЫЙ КОД: эмит обновлённых данных игрока ===
    const fullPlayerData = await getFullPlayerData(String(playerId));
    if (fullPlayerData) {
      getIO().emit("player:updated", fullPlayerData);
    }
    // =============================================

    return {
      success: true,
      message: "Способность применена",
      effect: effectResult,
    };
  },
};

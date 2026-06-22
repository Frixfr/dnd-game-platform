// server/src/services/playerAbilitiesService.ts

import { db } from "../db/index.js";
import { logsService } from "./logsService.js";
import { emitPlayerUpdate } from "../socket/index.js";
import { applyInstantHealthChange } from "../utils/helpers.js";

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
        } else if (!effect.is_instant) {
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

    await emitPlayerUpdate(player_id);
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
    await emitPlayerUpdate(player_id);
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
    await emitPlayerUpdate(player_id);
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

    const remainingCooldown = playerAbility.remaining_cooldown_turns || 0;
    if (remainingCooldown > 0) {
      throw new Error(
        `Способность на перезарядке: осталось ${remainingCooldown} ходов`,
      );
    }

    let effectResult = null;
    let isInstant = false;
    if (ability.effect_id) {
      const effect = await db("effects")
        .where({ id: ability.effect_id })
        .first();
      if (effect) {
        effectResult = effect;
        isInstant = effect.is_instant || false;

        if (isInstant) {
          // ---- Мгновенный эффект: применяем изменение здоровья ----
          const player = await db("players").where("id", playerId).first();
          if (!player) throw new Error("Игрок не найден");

          // Получаем все активные эффекты игрока (кроме текущего, который ещё не добавлен)
          const allActiveEffects = await db("player_active_effects")
            .where({ player_id: playerId })
            .join("effects", "player_active_effects.effect_id", "effects.id")
            .select("effects.*");

          // Получаем пассивные эффекты от предметов
          const playerItems = await db("player_items")
            .where({ player_id: playerId })
            .join("items", "player_items.item_id", "items.id")
            .select("items.id");
          const itemIds = playerItems.map((row) => row.id);
          let passiveEffects: any[] = [];
          if (itemIds.length > 0) {
            passiveEffects = await db("item_effects")
              .whereIn("item_id", itemIds)
              .where({ effect_type: "passive" })
              .join("effects", "item_effects.effect_id", "effects.id")
              .select("effects.*");
          }

          // Получаем эффекты расы
          let raceEffects: any[] = [];
          if (player.race_id) {
            const raceEffectsRaw = await db("race_effects")
              .where("race_id", player.race_id)
              .join("effects", "race_effects.effect_id", "effects.id")
              .select("effects.*");
            raceEffects = raceEffectsRaw;
          }

          // Считаем бонус к max_health от всех эффектов (включая текущий, если он влияет на max_health)
          let maxHealthBonus = 0;
          const allEffects = [
            ...allActiveEffects,
            ...passiveEffects,
            ...raceEffects,
          ];
          for (const e of allEffects) {
            if (
              e.attribute === "max_health" &&
              typeof e.modifier === "number"
            ) {
              maxHealthBonus += e.modifier;
            }
          }
          // Добавляем бонус от самого эффекта, если он на max_health
          if (
            effect.attribute === "max_health" &&
            typeof effect.modifier === "number"
          ) {
            maxHealthBonus += effect.modifier;
          }
          const effectiveMaxHealth = player.max_health + maxHealthBonus;

          // Применяем изменение здоровья
          const newHealth = applyInstantHealthChange(
            player.health,
            { attribute: effect.attribute, modifier: effect.modifier },
            effectiveMaxHealth,
          );
          if (newHealth !== null && newHealth !== player.health) {
            await db("players")
              .where("id", playerId)
              .update({ health: newHealth });
          }

          // Логируем мгновенное применение (с пометкой instant)
          const playerData = await db("players").where("id", playerId).first();
          if (playerData) {
            await logsService.create({
              action_type: "effect_gain",
              player_id: playerId,
              npc_id: null,
              entity_name: playerData.name,
              action_name: effect.name,
              details: JSON.stringify({
                source_type: "ability",
                source_id: abilityId,
                instant: true,
              }),
            });
          }

          // Не создаём запись в active_effects
        } else {
          // ---- Обычный (не мгновенный) эффект: создаём запись ----
          await db("player_active_effects").insert({
            player_id: playerId,
            effect_id: ability.effect_id,
            source_type: "ability",
            source_id: abilityId,
            remaining_turns: effect.duration_turns,
            remaining_days: effect.duration_days,
          });
        }
      }
    }

    // Устанавливаем кулдаун
    await db("player_abilities")
      .where({ player_id: playerId, ability_id: abilityId })
      .update({
        remaining_cooldown_turns: ability.cooldown_turns,
        remaining_cooldown_days: ability.cooldown_days,
      });

    // Логируем использование способности (всегда)
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
          instant_effect: isInstant,
        }),
      });
    }

    await emitPlayerUpdate(playerId);
    return {
      success: true,
      message: "Способность применена",
      effect: effectResult,
    };
  },
};

// server/src/services/npcAbilitiesService.ts
import { db } from "../db/index.js";
import { applyInstantHealthChange } from "../utils/helpers.js";

export const npcAbilitiesService = {
  async getAll(
    roomId: number,
    filters: {
      npc_id?: number;
      ability_id?: number;
      is_active?: boolean;
      with_details?: boolean;
    },
  ) {
    let query = db("npc_abilities").select("*");
    if (filters.npc_id) {
      // Проверяем, что NPC принадлежит комнате
      const npc = await db("npcs")
        .where({ id: filters.npc_id, room_id: roomId })
        .first();
      if (!npc) throw new Error("NPC не найден в этой комнате");
      query = query.where("npc_id", filters.npc_id);
    }
    if (filters.ability_id)
      query = query.where("ability_id", filters.ability_id);
    if (filters.is_active !== undefined)
      query = query.where("is_active", filters.is_active);
    const rows = await query.orderBy("obtained_at", "desc");

    if (filters.with_details) {
      for (const row of rows) {
        row.npc = await db("npcs").where("id", row.npc_id).first();
        row.ability = await db("abilities").where("id", row.ability_id).first();
      }
    }
    return rows;
  },

  async create(
    roomId: number,
    npc_id: number,
    ability_id: number,
    is_active: boolean,
  ) {
    const npc = await db("npcs").where({ id: npc_id, room_id: roomId }).first();
    if (!npc) throw new Error("NPC не найден в этой комнате");
    const ability = await db("abilities")
      .where({ id: ability_id, room_id: roomId })
      .first();
    if (!ability) throw new Error("Способность не найдена в этой комнате");

    const existing = await db("npc_abilities")
      .where({ npc_id, ability_id })
      .first();

    let result;
    if (existing) {
      const [updated] = await db("npc_abilities")
        .where({ npc_id, ability_id })
        .update({ is_active, obtained_at: db.fn.now() })
        .returning("*");
      result = updated;
    } else {
      const [newLink] = await db("npc_abilities")
        .insert({ npc_id, ability_id, is_active, obtained_at: db.fn.now() })
        .returning("*");
      result = newLink;
    }

    // Логика для пассивных способностей (создание/удаление эффекта у NPC)
    if (ability.ability_type === "passive" && ability.effect_id && is_active) {
      const effect = await db("effects").where("id", ability.effect_id).first();
      if (effect) {
        const existingEffect = await db("npc_active_effects")
          .where({
            npc_id,
            effect_id: ability.effect_id,
            source_type: "ability",
            source_id: ability_id,
          })
          .first();
        const remaining_turns = effect.duration_turns;
        const remaining_days = effect.duration_days;
        if (existingEffect) {
          await db("npc_active_effects")
            .where({ id: existingEffect.id })
            .update({
              remaining_turns,
              remaining_days,
              applied_at: db.fn.now(),
            });
        } else {
          await db("npc_active_effects").insert({
            npc_id,
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
      await db("npc_active_effects")
        .where({ npc_id, source_type: "ability", source_id: ability_id })
        .delete();
    }

    return result;
  },

  async delete(roomId: number, npc_id: number, ability_id: number) {
    const npc = await db("npcs").where({ id: npc_id, room_id: roomId }).first();
    if (!npc) throw new Error("NPC не найден в этой комнате");
    const ability = await db("abilities").where("id", ability_id).first();
    const deleted = await db("npc_abilities")
      .where({ npc_id, ability_id })
      .delete();
    if (deleted === 0) throw new Error("Not found");
    if (ability && ability.ability_type === "passive") {
      await db("npc_active_effects")
        .where({ npc_id, source_type: "ability", source_id: ability_id })
        .delete();
    }
    return true;
  },

  async toggleActive(
    roomId: number,
    npc_id: number,
    ability_id: number,
    is_active: boolean,
  ) {
    const npc = await db("npcs").where({ id: npc_id, room_id: roomId }).first();
    if (!npc) throw new Error("NPC не найден в этой комнате");
    const ability = await db("abilities").where("id", ability_id).first();
    if (!ability) throw new Error("Ability not found");
    const [updated] = await db("npc_abilities")
      .where({ npc_id, ability_id })
      .update({ is_active })
      .returning("*");
    if (!updated) throw new Error("NPC ability not found");

    // Обновляем пассивный эффект при переключении активности
    if (ability.ability_type === "passive" && ability.effect_id) {
      if (is_active) {
        const effect = await db("effects")
          .where("id", ability.effect_id)
          .first();
        if (effect) {
          const existing = await db("npc_active_effects")
            .where({
              npc_id,
              effect_id: ability.effect_id,
              source_type: "ability",
              source_id: ability_id,
            })
            .first();
          if (!existing) {
            await db("npc_active_effects").insert({
              npc_id,
              effect_id: ability.effect_id,
              source_type: "ability",
              source_id: ability_id,
              remaining_turns: effect.duration_turns,
              remaining_days: effect.duration_days,
            });
          }
        }
      } else {
        await db("npc_active_effects")
          .where({ npc_id, source_type: "ability", source_id: ability_id })
          .delete();
      }
    }
    return updated;
  },

  async useAbility(
    roomId: number,
    npcId: number,
    abilityId: number,
  ): Promise<{ success: boolean; message: string; effect?: any }> {
    const npc = await db("npcs").where({ id: npcId, room_id: roomId }).first();
    if (!npc) throw new Error("NPC не найден в этой комнате");
    const npcAbility = await db("npc_abilities")
      .where({ npc_id: npcId, ability_id: abilityId })
      .first();
    if (!npcAbility) throw new Error("Способность не найдена у NPC");
    if (!npcAbility.is_active) throw new Error("Способность неактивна");

    const ability = await db("abilities").where({ id: abilityId }).first();
    if (!ability) throw new Error("Способность не найдена");
    if (ability.ability_type !== "active")
      throw new Error("Можно использовать только активные способности");

    const remainingCooldown = npcAbility.remaining_cooldown_turns || 0;
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
          // Получаем все активные эффекты NPC (кроме текущего)
          const allActiveEffects = await db("npc_active_effects")
            .where({ npc_id: npcId })
            .join("effects", "npc_active_effects.effect_id", "effects.id")
            .select("effects.*");

          // Получаем пассивные эффекты от предметов
          const npcItems = await db("npc_items")
            .where({ npc_id: npcId })
            .join("items", "npc_items.item_id", "items.id")
            .select("items.id");
          const itemIds = npcItems.map((row) => row.id);
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
          if (npc.race_id) {
            const raceEffectsRaw = await db("race_effects")
              .where("race_id", npc.race_id)
              .join("effects", "race_effects.effect_id", "effects.id")
              .select("effects.*");
            raceEffects = raceEffectsRaw;
          }

          // Считаем бонус к max_health
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
          if (
            effect.attribute === "max_health" &&
            typeof effect.modifier === "number"
          ) {
            maxHealthBonus += effect.modifier;
          }
          const effectiveMaxHealth = npc.max_health + maxHealthBonus;

          // Применяем изменение здоровья
          const newHealth = applyInstantHealthChange(
            npc.health,
            { attribute: effect.attribute, modifier: effect.modifier },
            effectiveMaxHealth,
          );
          if (newHealth !== null && newHealth !== npc.health) {
            await db("npcs").where("id", npcId).update({ health: newHealth });
          }

          // Не создаём запись в active_effects
        } else {
          // ---- Обычный эффект: создаём запись ----
          await db("npc_active_effects").insert({
            npc_id: npcId,
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
    await db("npc_abilities")
      .where({ npc_id: npcId, ability_id: abilityId })
      .update({
        remaining_cooldown_turns: ability.cooldown_turns,
        remaining_cooldown_days: ability.cooldown_days,
      });

    return {
      success: true,
      message: "Способность применена",
      effect: effectResult,
    };
  },
};

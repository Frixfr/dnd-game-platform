// server/src/services/playerEffectsService.ts

import { db } from "../db/index.js";
import { logsService } from "./logsService.js";
import { emitPlayerUpdate } from "../socket/index.js";
import { getFullPlayerData } from "../utils/helpers.js";

export const playerEffectsService = {
  async getAll(
    roomId: number,
    filters: {
      player_id?: number;
      effect_id?: number;
      source_type?: string;
      with_details?: boolean;
    },
  ) {
    let query = db("player_active_effects").select("*");
    if (filters.player_id) {
      const player = await db("players")
        .where({ id: filters.player_id, room_id: roomId })
        .first();
      if (!player) throw new Error("Игрок не найден в этой комнате");
      query = query.where("player_id", filters.player_id);
    }
    if (filters.effect_id) query = query.where("effect_id", filters.effect_id);
    if (filters.source_type)
      query = query.where("source_type", filters.source_type);
    const rows = await query.orderBy("applied_at", "desc");

    if (filters.with_details) {
      for (const row of rows) {
        row.player = await db("players").where("id", row.player_id).first();
        row.effect = await db("effects").where("id", row.effect_id).first();
      }
    }
    return rows;
  },

  async create(
    roomId: number,
    data: {
      player_id: number;
      effect_id: number;
      source_type: string;
      source_id: number | null;
      remaining_turns: number | null;
      remaining_days: number | null;
    },
  ) {
    const player = await db("players")
      .where({ id: data.player_id, room_id: roomId })
      .first();
    if (!player) throw new Error("Игрок не найден в этой комнате");
    const effect = await db("effects")
      .where({ id: data.effect_id, room_id: roomId })
      .first();
    if (!effect) throw new Error("Effect not found");

    // Получаем все активные эффекты игрока (кроме текущего, который ещё не добавлен)
    // и пассивные эффекты от предметов для расчёта итогового max_health
    const allActiveEffects = await db("player_active_effects")
      .where({ player_id: data.player_id })
      .join("effects", "player_active_effects.effect_id", "effects.id")
      .select("effects.*");

    const fullPlayerData = await getFullPlayerData(data.player_id);
    const passiveEffects = fullPlayerData
      ? fullPlayerData.items.flatMap((item) => item.passive_effects || [])
      : [];

    // Получаем эффекты расы для учёта бонусов к max_health
    let raceEffects: any[] = [];
    if (player.race_id) {
      const raceEffectsRaw = await db("race_effects")
        .where("race_id", player.race_id)
        .join("effects", "race_effects.effect_id", "effects.id")
        .select("effects.*");
      raceEffects = raceEffectsRaw;
    }

    // Считаем бонус к max_health от всех активных и пассивных эффектов, включая расу
    let maxHealthBonus = 0;
    for (const e of allActiveEffects) {
      if (e.attribute === "max_health" && typeof e.modifier === "number") {
        maxHealthBonus += e.modifier;
      }
    }
    for (const pe of passiveEffects) {
      if (pe.attribute === "max_health" && typeof pe.modifier === "number") {
        maxHealthBonus += pe.modifier;
      }
    }
    for (const re of raceEffects) {
      if (re.attribute === "max_health" && typeof re.modifier === "number") {
        maxHealthBonus += re.modifier;
      }
    }

    // Если текущий эффект тоже увеличивает max_health, добавляем его бонус
    if (
      effect.attribute === "max_health" &&
      typeof effect.modifier === "number"
    ) {
      maxHealthBonus += effect.modifier;
    }

    const effectiveMaxHealth = player.max_health + maxHealthBonus;

    // Если эффект увеличивает max_health, то увеличиваем и текущее здоровье на величину бонуса
    // Если эффект изменяет health (лечение/урон), применяем сразу, но ограничиваем эффективным max_health
    let newHealth = player.health;
    if (
      effect.attribute === "max_health" &&
      typeof effect.modifier === "number"
    ) {
      // При увеличении max_health, текущее здоровье увеличивается на ту же величину
      newHealth = Math.min(player.health + effect.modifier, effectiveMaxHealth);
    } else if (
      effect.attribute === "health" &&
      typeof effect.modifier === "number"
    ) {
      // Лечение/урон: применяем, но не превышаем эффективный максимум
      newHealth = Math.max(
        0,
        Math.min(player.health + effect.modifier, effectiveMaxHealth),
      );
    }

    // Мгновенные эффекты: применяем health-изменение, но НЕ создаём запись в active_effects
    if (effect.is_instant) {
      if (newHealth !== player.health) {
        await db("players")
          .where("id", data.player_id)
          .update({ health: newHealth });
      }
      await logsService.create({
        action_type: "effect_gain",
        player_id: data.player_id,
        npc_id: null,
        entity_name: player.name,
        action_name: effect.name,
        details: JSON.stringify({
          source_type: data.source_type,
          source_id: data.source_id,
          instant: true,
        }),
        room_id: roomId,
      });
      await emitPlayerUpdate(data.player_id);
      return {
        ...effect,
        remaining_turns: null,
        remaining_days: null,
        applied_at: new Date().toISOString(),
      };
    }

    const [newEffect] = await db("player_active_effects")
      .insert({
        player_id: data.player_id,
        effect_id: data.effect_id,
        source_type: data.source_type,
        source_id: data.source_id,
        remaining_turns: data.remaining_turns,
        remaining_days: data.remaining_days,
        applied_at: db.fn.now(),
      })
      .returning("*");

    // Применяем увеличение здоровья если нужно
    if (newHealth !== player.health) {
      await db("players")
        .where("id", data.player_id)
        .update({ health: newHealth });
    }

    // Логирование и эмит для всех эффектов (включая мгновенные)
    await logsService.create({
      action_type: "effect_gain",
      player_id: data.player_id,
      npc_id: null,
      entity_name: player.name,
      action_name: effect.name,
      details: JSON.stringify({
        source_type: data.source_type,
        source_id: data.source_id,
      }),
      room_id: roomId,
    });
    await emitPlayerUpdate(data.player_id);
    return newEffect;
  },

  async delete(roomId: number, player_id: number, effect_id: number) {
    const player = await db("players")
      .where({ id: player_id, room_id: roomId })
      .first();
    if (!player) throw new Error("Игрок не найден в этой комнате");

    const activeEffect = await db("player_active_effects")
      .where({ player_id, effect_id })
      .first();

    if (!activeEffect) throw new Error("Not found");

    const effect = await db("effects").where("id", effect_id).first();

    // Если это временный эффект с модификатором max_health,
    // и текущее здоровье больше базового max_health, уменьшаем до базового max_health
    let newHealth = player.health;
    if (
      effect &&
      effect.attribute === "max_health" &&
      typeof effect.modifier === "number" &&
      !effect.is_permanent
    ) {
      // Получаем все активные эффекты игрока, чтобы посчитать итоговый max_health после удаления
      const allActiveEffects = await db("player_active_effects")
        .where({ player_id })
        .whereNot({ effect_id })
        .join("effects", "player_active_effects.effect_id", "effects.id")
        .select("effects.*");

      // Получаем эффекты расы для учёта бонусов к max_health
      let raceEffects: any[] = [];
      if (player.race_id) {
        const raceEffectsRaw = await db("race_effects")
          .where("race_id", player.race_id)
          .join("effects", "race_effects.effect_id", "effects.id")
          .select("effects.*");
        raceEffects = raceEffectsRaw;
      }

      // Считаем оставшийся бонус к max_health
      let remainingMaxHealthBonus = 0;
      for (const e of allActiveEffects) {
        if (e.attribute === "max_health" && typeof e.modifier === "number") {
          remainingMaxHealthBonus += e.modifier;
        }
      }

      // Также учитываем пассивные эффекты от предметов
      const fullPlayerData = await getFullPlayerData(player_id);
      if (fullPlayerData) {
        const passiveEffects = fullPlayerData.items.flatMap(
          (item) => item.passive_effects || [],
        );
        for (const pe of passiveEffects) {
          if (
            pe.attribute === "max_health" &&
            typeof pe.modifier === "number"
          ) {
            remainingMaxHealthBonus += pe.modifier;
          }
        }
      }

      // Добавляем бонусы от расы
      for (const re of raceEffects) {
        if (re.attribute === "max_health" && typeof re.modifier === "number") {
          remainingMaxHealthBonus += re.modifier;
        }
      }

      const newMaxHealth = player.max_health + remainingMaxHealthBonus;

      // Если текущее здоровье больше нового максимального, уменьшаем
      if (player.health > newMaxHealth) {
        newHealth = newMaxHealth;
      }
    }

    const deleted = await db("player_active_effects")
      .where({ player_id, effect_id, source_type: "admin" })
      .delete();
    if (deleted === 0) {
      if (!activeEffect) throw new Error("Not found");
      throw new Error("Cannot delete non-admin effect");
    }

    // Применяем уменьшение здоровья если нужно
    if (newHealth !== player.health) {
      await db("players").where("id", player_id).update({ health: newHealth });
    }

    await emitPlayerUpdate(player_id);
    return true;
  },
};

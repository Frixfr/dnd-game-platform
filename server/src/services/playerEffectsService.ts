// server/src/services/playerEffectsService.ts

import { db } from "../db/index.js";
import { logsService } from "./logsService.js";
import { emitPlayerUpdate } from "../socket/index.js";
import { getFullPlayerData } from "../utils/helpers.js";

export const playerEffectsService = {
  async getAll(filters: {
    player_id?: number;
    effect_id?: number;
    source_type?: string;
    with_details?: boolean;
  }) {
    let query = db("player_active_effects").select("*");
    if (filters.player_id) query = query.where("player_id", filters.player_id);
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

  async create(data: {
    player_id: number;
    effect_id: number;
    source_type: string;
    source_id: number | null;
    remaining_turns: number | null;
    remaining_days: number | null;
  }) {
    const player = await db("players").where("id", data.player_id).first();
    if (!player) throw new Error("Player not found");
    const effect = await db("effects").where("id", data.effect_id).first();
    if (!effect) throw new Error("Effect not found");

    // Если эффект увеличивает max_health, то увеличиваем и текущее здоровье
    // Если эффект изменяет health (лечение/урон), применяем сразу
    let newHealth = player.health;
    if (effect.attribute === "max_health" && typeof effect.modifier === "number") {
      newHealth = Math.min(player.health + effect.modifier, player.max_health + effect.modifier);
    } else if (effect.attribute === "health" && typeof effect.modifier === "number") {
      newHealth = Math.max(0, Math.min(player.health + effect.modifier, player.max_health));
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

    if (player && effect) {
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
      });
    }
    await emitPlayerUpdate(data.player_id);
    return newEffect;
  },

  async delete(player_id: number, effect_id: number) {
    const player = await db("players").where("id", player_id).first();
    if (!player) throw new Error("Player not found");
    
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
        const passiveEffects = fullPlayerData.items.flatMap((item) => item.passive_effects || []);
        for (const pe of passiveEffects) {
          if (pe.attribute === "max_health" && typeof pe.modifier === "number") {
            remainingMaxHealthBonus += pe.modifier;
          }
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
      await db("players")
        .where("id", player_id)
        .update({ health: newHealth });
    }
    
    await emitPlayerUpdate(player_id);
    return true;
  },
};

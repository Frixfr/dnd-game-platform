import { db } from "../db/index.js";
import { getFullNpcData } from "../utils/helpers.js";

export const npcEffectsService = {
  async getAll(filters: {
    npc_id?: number;
    effect_id?: number;
    source_type?: string;
    with_details?: boolean;
  }) {
    let query = db("npc_active_effects").select("*");
    if (filters.npc_id) query = query.where("npc_id", filters.npc_id);
    if (filters.effect_id) query = query.where("effect_id", filters.effect_id);
    if (filters.source_type)
      query = query.where("source_type", filters.source_type);
    const rows = await query.orderBy("applied_at", "desc");

    if (filters.with_details) {
      for (const row of rows) {
        row.npc = await db("npcs").where("id", row.npc_id).first();
        row.effect = await db("effects").where("id", row.effect_id).first();
      }
    }
    return rows;
  },

  async create(data: {
    npc_id: number;
    effect_id: number;
    source_type: string;
    source_id: number | null;
    remaining_turns: number | null;
    remaining_days: number | null;
  }) {
    const npc = await db("npcs").where("id", data.npc_id).first();
    if (!npc) throw new Error("NPC not found");
    const effect = await db("effects").where("id", data.effect_id).first();
    if (!effect) throw new Error("Effect not found");

    // Если эффект увеличивает max_health, то увеличиваем и текущее здоровье
    // Если эффект изменяет health (лечение/урон), применяем сразу
    let newHealth = npc.health;
    if (effect.attribute === "max_health" && typeof effect.modifier === "number") {
      newHealth = Math.min(npc.health + effect.modifier, npc.max_health + effect.modifier);
    } else if (effect.attribute === "health" && typeof effect.modifier === "number") {
      newHealth = Math.max(0, Math.min(npc.health + effect.modifier, npc.max_health));
    }

    const [newEffect] = await db("npc_active_effects")
      .insert({
        npc_id: data.npc_id,
        effect_id: data.effect_id,
        source_type: data.source_type,
        source_id: data.source_id,
        remaining_turns: data.remaining_turns,
        remaining_days: data.remaining_days,
        applied_at: db.fn.now(),
      })
      .returning("*");

    // Применяем увеличение здоровья если нужно
    if (newHealth !== npc.health) {
      await db("npcs")
        .where("id", data.npc_id)
        .update({ health: newHealth });
    }

    return newEffect;
  },

  async delete(npc_id: number, effect_id: number) {
    const npc = await db("npcs").where("id", npc_id).first();
    if (!npc) throw new Error("NPC not found");

    const activeEffect = await db("npc_active_effects")
      .where({ npc_id, effect_id })
      .first();

    if (!activeEffect) throw new Error("Not found");

    const effect = await db("effects").where("id", effect_id).first();

    // Если это временный эффект с модификатором max_health,
    // и текущее здоровье больше базового max_health, уменьшаем до базового max_health
    let newHealth = npc.health;
    if (
      effect &&
      effect.attribute === "max_health" &&
      typeof effect.modifier === "number" &&
      !effect.is_permanent
    ) {
      // Получаем все активные эффекты NPC, чтобы посчитать итоговый max_health после удаления
      const allActiveEffects = await db("npc_active_effects")
        .where({ npc_id })
        .whereNot({ effect_id })
        .join("effects", "npc_active_effects.effect_id", "effects.id")
        .select("effects.*");

      // Считаем оставшийся бонус к max_health
      let remainingMaxHealthBonus = 0;
      for (const e of allActiveEffects) {
        if (e.attribute === "max_health" && typeof e.modifier === "number") {
          remainingMaxHealthBonus += e.modifier;
        }
      }

      // Также учитываем пассивные эффекты от предметов
      const fullNpcData = await getFullNpcData(npc_id);
      if (fullNpcData) {
        const passiveEffects = fullNpcData.items.flatMap((item) => item.passive_effects || []);
        for (const pe of passiveEffects) {
          if (pe.attribute === "max_health" && typeof pe.modifier === "number") {
            remainingMaxHealthBonus += pe.modifier;
          }
        }
      }

      const newMaxHealth = npc.max_health + remainingMaxHealthBonus;

      // Если текущее здоровье больше нового максимального, уменьшаем
      if (npc.health > newMaxHealth) {
        newHealth = newMaxHealth;
      }
    }

    const deleted = await db("npc_active_effects")
      .where({ npc_id, effect_id, source_type: "admin" })
      .delete();
    if (deleted === 0) {
      if (!activeEffect) throw new Error("Not found");
      throw new Error("Cannot delete non-admin effect");
    }

    // Применяем уменьшение здоровья если нужно
    if (newHealth !== npc.health) {
      await db("npcs")
        .where("id", npc_id)
        .update({ health: newHealth });
    }

    return true;
  },
};

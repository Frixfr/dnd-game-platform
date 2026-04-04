import { db } from "../db/index.js";
import { getFullNpcData, ensureFrightenedEffect } from "../utils/helpers.js";
import type { NPC, FullNPCData } from "../types/index.js";

export const npcsService = {
  async getAll(): Promise<NPC[]> {
    return db("npcs").select("*");
  },

  async getById(id: string): Promise<NPC | null> {
    return db("npcs").where({ id }).first();
  },

  async getFullDetails(id: string): Promise<FullNPCData | null> {
    return getFullNpcData(id);
  },

  async create(data: Omit<NPC, "id" | "created_at">): Promise<NPC> {
    const [npc] = await db("npcs").insert(data).returning("*");
    return npc;
  },

  async update(id: string, data: Partial<NPC>): Promise<NPC | null> {
    const [updated] = await db("npcs")
      .where({ id })
      .update(data)
      .returning("*");
    return updated || null;
  },

  async delete(id: string): Promise<boolean> {
    // Проверка связей
    const hasAbilities = await db("npc_abilities").where("npc_id", id).first();
    if (hasAbilities) throw new Error("NPC has relations");
    const hasItems = await db("npc_items").where("npc_id", id).first();
    if (hasItems) throw new Error("NPC has relations");
    const hasEffects = await db("npc_active_effects")
      .where("npc_id", id)
      .first();
    if (hasEffects) throw new Error("NPC has relations");

    const deleted = await db("npcs").where({ id }).delete();
    return deleted > 0;
  },

  async intimidate(npcId: string): Promise<{ npc: NPC }> {
    const npc = await db("npcs").where("id", npcId).first();
    if (!npc) throw new Error("NPC не найден");
    if (npc.aggression !== 0) {
      throw new Error(
        "Запугивание возможно только для спокойных NPC (aggression = 0)",
      );
    }

    const [updated] = await db("npcs")
      .where("id", npcId)
      .update({ aggression: 1 })
      .returning("*");
    const effect = await ensureFrightenedEffect();

    const existing = await db("npc_active_effects")
      .where({ npc_id: npcId, effect_id: effect.id })
      .first();
    if (!existing) {
      await db("npc_active_effects").insert({
        npc_id: npcId,
        effect_id: effect.id,
        source_type: "admin",
        source_id: null,
        remaining_turns: effect.duration_turns,
        remaining_days: effect.duration_days,
        applied_at: db.fn.now(),
      });
    }
    return { npc: updated };
  },

  async modifyAggression(npcId: string, delta: number): Promise<NPC> {
    const npc = await db("npcs").where("id", npcId).first();
    if (!npc) throw new Error("NPC не найден");
    if (npc.aggression !== 1) {
      throw new Error(
        "Изменение агрессии возможно только для напуганных NPC (aggression = 1)",
      );
    }
    const newAggression = npc.aggression + delta;
    if (newAggression < 0 || newAggression > 2) {
      throw new Error("Результат агрессии должен быть в диапазоне 0-2");
    }
    const [updated] = await db("npcs")
      .where("id", npcId)
      .update({ aggression: newAggression })
      .returning("*");
    return updated;
  },

  async calm(
    npcId: string,
    playerId?: number,
    abilityId?: number,
  ): Promise<NPC> {
    const npc = await db("npcs").where("id", npcId).first();
    if (!npc) throw new Error("NPC не найден");
    if (npc.aggression !== 2) {
      throw new Error(
        "Успокоение возможно только для агрессивных NPC (aggression = 2)",
      );
    }

    if (playerId && abilityId) {
      const ability = await db("abilities").where("id", abilityId).first();
      if (!ability || ability.name !== "Успокоение") {
        throw new Error(
          'У игрока нет способности "Успокоение" или она не найдена',
        );
      }
      const hasAbility = await db("player_abilities")
        .where({ player_id: playerId, ability_id: abilityId, is_active: true })
        .first();
      if (!hasAbility) {
        throw new Error('У игрока нет активной способности "Успокоение"');
      }
    } else if (playerId || abilityId) {
      throw new Error(
        "Для проверки способности нужно указать и playerId, и abilityId",
      );
    }

    const [updated] = await db("npcs")
      .where("id", npcId)
      .update({ aggression: 1 })
      .returning("*");
    return updated;
  },

  async setAggression(npcId: string, aggression: number): Promise<NPC> {
    const npc = await db("npcs").where("id", npcId).first();
    if (!npc) throw new Error("NPC не найден");
    const [updated] = await db("npcs")
      .where("id", npcId)
      .update({ aggression })
      .returning("*");
    return updated;
  },
};

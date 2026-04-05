import { db } from "../db/index.js";

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
    return newEffect;
  },

  async delete(npc_id: number, effect_id: number) {
    const deleted = await db("npc_active_effects")
      .where({ npc_id, effect_id, source_type: "admin" })
      .delete();
    if (deleted === 0) {
      const exists = await db("npc_active_effects")
        .where({ npc_id, effect_id })
        .first();
      if (!exists) throw new Error("Not found");
      throw new Error("Cannot delete non-admin effect");
    }
    return true;
  },
};

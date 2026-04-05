import { db } from "../db/index.js";

export const npcItemsService = {
  async getAll(filters: {
    npc_id?: number;
    item_id?: number;
    is_equipped?: boolean;
    with_details?: boolean;
  }) {
    let query = db("npc_items").select("*");
    if (filters.npc_id) query = query.where("npc_id", filters.npc_id);
    if (filters.item_id) query = query.where("item_id", filters.item_id);
    if (filters.is_equipped !== undefined)
      query = query.where("is_equipped", filters.is_equipped);
    const rows = await query.orderBy("obtained_at", "desc");

    if (filters.with_details) {
      for (const row of rows) {
        row.npc = await db("npcs").where("id", row.npc_id).first();
        row.item = await db("items").where("id", row.item_id).first();
      }
    }
    return rows;
  },

  async create(
    npc_id: number,
    item_id: number,
    quantity: number,
    is_equipped: boolean,
  ) {
    const npc = await db("npcs").where("id", npc_id).first();
    if (!npc) throw new Error("NPC not found");
    const item = await db("items").where("id", item_id).first();
    if (!item) throw new Error("Item not found");

    const existing = await db("npc_items").where({ npc_id, item_id }).first();
    if (existing) {
      const newQuantity = existing.quantity + quantity;
      const [updated] = await db("npc_items")
        .where("id", existing.id)
        .update({
          quantity: newQuantity,
          is_equipped: is_equipped || existing.is_equipped,
        })
        .returning("*");
      return updated;
    }

    const [newItem] = await db("npc_items")
      .insert({
        npc_id,
        item_id,
        quantity,
        is_equipped,
        obtained_at: db.fn.now(),
      })
      .returning("*");
    return newItem;
  },

  async delete(npc_id: number, item_id: number) {
    const deleted = await db("npc_items").where({ npc_id, item_id }).delete();
    if (deleted === 0) throw new Error("Not found");
    return true;
  },

  async toggleEquip(id: number, is_equipped: boolean) {
    const [updated] = await db("npc_items")
      .where("id", id)
      .update({ is_equipped })
      .returning("*");
    if (!updated) throw new Error("Not found");
    return updated;
  },
};

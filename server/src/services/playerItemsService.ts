import { db } from "../db/index.js";

export const playerItemsService = {
  async getAll(filters: {
    player_id?: number;
    item_id?: number;
    is_equipped?: boolean;
    with_details?: boolean;
  }) {
    let query = db("player_items").select("*");
    if (filters.player_id) query = query.where("player_id", filters.player_id);
    if (filters.item_id) query = query.where("item_id", filters.item_id);
    if (filters.is_equipped !== undefined)
      query = query.where("is_equipped", filters.is_equipped);
    const rows = await query.orderBy("obtained_at", "desc");

    if (filters.with_details) {
      for (const row of rows) {
        row.player = await db("players").where("id", row.player_id).first();
        row.item = await db("items").where("id", row.item_id).first();
      }
    }
    return rows;
  },

  async create(
    player_id: number,
    item_id: number,
    quantity: number,
    is_equipped: boolean,
  ) {
    const player = await db("players").where("id", player_id).first();
    if (!player) throw new Error("Player not found");
    const item = await db("items").where("id", item_id).first();
    if (!item) throw new Error("Item not found");

    const existing = await db("player_items")
      .where({ player_id, item_id })
      .first();
    if (existing) {
      const newQuantity = existing.quantity + quantity;
      const [updated] = await db("player_items")
        .where("id", existing.id)
        .update({
          quantity: newQuantity,
          is_equipped: is_equipped || existing.is_equipped,
        })
        .returning("*");
      return updated;
    }

    const [newItem] = await db("player_items")
      .insert({
        player_id,
        item_id,
        quantity,
        is_equipped,
        obtained_at: db.fn.now(),
      })
      .returning("*");
    return newItem;
  },

  async delete(player_id: number, item_id: number) {
    const deleted = await db("player_items")
      .where({ player_id, item_id })
      .delete();
    if (deleted === 0) throw new Error("Not found");
    return true;
  },

  async toggleEquip(id: number, is_equipped: boolean) {
    const [updated] = await db("player_items")
      .where("id", id)
      .update({ is_equipped })
      .returning("*");
    if (!updated) throw new Error("Not found");
    return updated;
  },
};

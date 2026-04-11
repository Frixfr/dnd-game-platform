import { db } from "../db/index.js";
import type { Item, PaginatedResponse } from "../types/index.js";

export const itemsService = {
  async getAll(
    page?: number,
    limit?: number,
  ): Promise<Item[] | PaginatedResponse<Item>> {
    let query = db("items").select("*");

    if (page === undefined || limit === undefined) {
      return query;
    }

    const offset = (page - 1) * limit;
    const totalQuery = query
      .clone()
      .clearSelect()
      .clearOrder()
      .count("id as count")
      .first();
    const totalResult = await totalQuery;
    const total = Number(totalResult?.count) || 0;

    const data = await query.limit(limit).offset(offset);
    return { data, total, page, limit };
  },

  async getById(id: string): Promise<Item | null> {
    return db("items").where({ id }).first();
  },

  async create(
    data: Omit<Item, "id" | "created_at" | "updated_at">,
  ): Promise<Item> {
    const now = db.fn.now();
    const [item] = await db("items")
      .insert({ ...data, created_at: now, updated_at: now })
      .returning("*");
    return item;
  },

  async update(
    id: string,
    data: Partial<Omit<Item, "id" | "created_at">>,
  ): Promise<Item | null> {
    const [updated] = await db("items")
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning("*");
    return updated || null;
  },

  async delete(id: string): Promise<boolean> {
    // Проверка использования игроками
    const usedByPlayer = await db("player_items").where("item_id", id).first();
    if (usedByPlayer) throw new Error("Item is in use");
    // Проверка использования NPC
    const usedByNpc = await db("npc_items").where("item_id", id).first();
    if (usedByNpc) throw new Error("Item is in use");

    const deleted = await db("items").where({ id }).delete();
    return deleted > 0;
  },

  async checkEffectExists(effectId: number): Promise<boolean> {
    const effect = await db("effects").where("id", effectId).first();
    return !!effect;
  },
};

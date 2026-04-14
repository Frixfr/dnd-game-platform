import { db } from "../db/index.js";
import type { Item, Effect, PaginatedResponse } from "../types/index.js";

export const itemsService = {
  async getAll(
    page?: number,
    limit?: number,
  ): Promise<Item[] | PaginatedResponse<Item>> {
    let query = db("items").select("*");
    if (page !== undefined && limit !== undefined) {
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
      for (const item of data) {
        item.effects = await this.getItemEffects(item.id);
      }
      return { data, total, page, limit };
    } else {
      const data = await query;
      for (const item of data) {
        item.effects = await this.getItemEffects(item.id);
      }
      return data;
    }
  },

  async getById(id: string | number): Promise<Item | null> {
    const item = await db("items").where({ id }).first();
    if (item) {
      item.effects = await this.getItemEffects(item.id);
    }
    return item;
  },

  async getItemEffects(
    itemId: number,
  ): Promise<(Effect & { effect_type: "active" | "passive" })[]> {
    const rows = await db("item_effects")
      .join("effects", "item_effects.effect_id", "effects.id")
      .where("item_effects.item_id", itemId)
      .select("effects.*", "item_effects.effect_type");
    return rows;
  },

  async create(data: {
    name: string;
    description?: string;
    rarity: Item["rarity"];
    base_quantity: number;
    is_deletable: boolean;
    is_usable: boolean;
    infinite_uses: boolean;
    active_effect_ids?: number[];
    passive_effect_ids?: number[];
  }): Promise<Item> {
    const now = db.fn.now();
    const [item] = await db("items")
      .insert({
        name: data.name,
        description: data.description,
        rarity: data.rarity,
        base_quantity: data.base_quantity,
        is_deletable: data.is_deletable,
        is_usable: data.is_usable,
        infinite_uses: data.infinite_uses,
        created_at: now,
        updated_at: now,
      })
      .returning("*");

    const activeIds = data.active_effect_ids || [];
    const passiveIds = data.passive_effect_ids || [];
    for (const effectId of activeIds) {
      await db("item_effects").insert({
        item_id: item.id,
        effect_id: effectId,
        effect_type: "active",
        created_at: now,
      });
    }
    for (const effectId of passiveIds) {
      await db("item_effects").insert({
        item_id: item.id,
        effect_id: effectId,
        effect_type: "passive",
        created_at: now,
      });
    }

    item.effects = await this.getItemEffects(item.id);
    return item;
  },

  async update(
    id: number,
    data: Partial<Omit<Item, "id" | "created_at">> & {
      active_effect_ids?: number[];
      passive_effect_ids?: number[];
    },
  ): Promise<Item | null> {
    const updateData: any = { updated_at: db.fn.now() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.rarity !== undefined) updateData.rarity = data.rarity;
    if (data.base_quantity !== undefined)
      updateData.base_quantity = data.base_quantity;
    if (data.is_deletable !== undefined)
      updateData.is_deletable = data.is_deletable;
    if (data.is_usable !== undefined) updateData.is_usable = data.is_usable;
    if (data.infinite_uses !== undefined)
      updateData.infinite_uses = data.infinite_uses;

    const [updated] = await db("items")
      .where({ id })
      .update(updateData)
      .returning("*");
    if (!updated) return null;

    // Обновляем эффекты
    await db("item_effects").where({ item_id: id }).delete();
    const activeIds = data.active_effect_ids || [];
    const passiveIds = data.passive_effect_ids || [];
    const now = db.fn.now();
    for (const effectId of activeIds) {
      await db("item_effects").insert({
        item_id: id,
        effect_id: effectId,
        effect_type: "active",
        created_at: now,
      });
    }
    for (const effectId of passiveIds) {
      await db("item_effects").insert({
        item_id: id,
        effect_id: effectId,
        effect_type: "passive",
        created_at: now,
      });
    }

    updated.effects = await this.getItemEffects(id);
    return updated;
  },

  async delete(id: number): Promise<boolean> {
    const usedByPlayer = await db("player_items").where("item_id", id).first();
    if (usedByPlayer) throw new Error("Item is in use");
    const usedByNpc = await db("npc_items").where("item_id", id).first();
    if (usedByNpc) throw new Error("Item is in use");
    const deleted = await db("items").where({ id }).delete();
    return deleted > 0;
  },
};

// server/src/services/playersService.ts

import { db } from "../db/index.js";
import { getFullPlayerData } from "../utils/helpers.js";
import type { Player, FullPlayerData } from "../types/index.js";

export const playersService = {
  async getAll(): Promise<Player[]> {
    return db("players").select("*");
  },

  async getById(id: string): Promise<Player | null> {
    return db("players").where({ id }).first();
  },

  async getFullDetails(id: string): Promise<FullPlayerData | null> {
    return getFullPlayerData(id);
  },

  async create(data: Omit<Player, "id" | "created_at">): Promise<Player> {
    const [player] = await db("players").insert(data).returning("*");
    return player;
  },

  async update(id: string, data: Partial<Player>): Promise<Player | null> {
    const [updated] = await db("players")
      .where({ id })
      .update(data)
      .returning("*");
    return updated || null;
  },

  async delete(id: string): Promise<boolean> {
    const deleted = await db("players").where({ id }).delete();
    return deleted > 0;
  },

  // Batch операции
  async addItemsBatch(
    playerId: string,
    items: { item_id: number; quantity: number }[],
  ) {
    const player = await db("players").where("id", playerId).first();
    if (!player) throw new Error("Игрок не найден");

    const results = [];
    for (const { item_id, quantity = 1 } of items) {
      const item = await db("items").where("id", item_id).first();
      if (!item) {
        results.push({ item_id, error: "Предмет не найден" });
        continue;
      }
      const existing = await db("player_items")
        .where({ player_id: playerId, item_id })
        .first();
      if (existing) {
        const newQuantity = existing.quantity + quantity;
        const [updated] = await db("player_items")
          .where("id", existing.id)
          .update({ quantity: newQuantity })
          .returning("*");
        results.push({
          item_id,
          success: true,
          message: "Количество обновлено",
          data: updated,
        });
      } else {
        const [newItem] = await db("player_items")
          .insert({
            player_id: playerId,
            item_id,
            quantity,
            is_equipped: false,
            obtained_at: db.fn.now(),
          })
          .returning("*");
        results.push({
          item_id,
          success: true,
          message: "Предмет добавлен",
          data: newItem,
        });
      }
    }
    return { success: true, message: "Операция завершена", results };
  },

  async addAbilitiesBatch(playerId: string, abilityIds: number[]) {
    const player = await db("players").where("id", playerId).first();
    if (!player) throw new Error("Игрок не найден");

    const results = [];
    for (const ability_id of abilityIds) {
      const ability = await db("abilities").where("id", ability_id).first();
      if (!ability) {
        results.push({
          ability_id,
          success: false,
          error: "Способность не найдена",
        });
        continue;
      }
      const effect = await db("effects").where("id", ability.effect_id).first();
      if (!effect) {
        results.push({
          ability_id,
          success: false,
          error: "Эффект способности не найден",
        });
        continue;
      }
      const existing = await db("player_abilities")
        .where({ player_id: playerId, ability_id })
        .first();
      if (existing) {
        const [updated] = await db("player_abilities")
          .where({ player_id: playerId, ability_id })
          .update({ is_active: true, obtained_at: db.fn.now() })
          .returning("*");
        results.push({
          ability_id,
          success: true,
          action: "updated",
          player_ability: updated,
        });
      } else {
        const [newLink] = await db("player_abilities")
          .insert({
            player_id: playerId,
            ability_id,
            is_active: true,
            obtained_at: db.fn.now(),
          })
          .returning("*");
        results.push({
          ability_id,
          success: true,
          action: "created",
          player_ability: newLink,
        });
      }
      // Если пассивная способность, добавить эффект
      if (ability.ability_type === "passive") {
        await db("player_active_effects")
          .insert({
            player_id: playerId,
            effect_id: ability.effect_id,
            source_type: "ability",
            source_id: ability_id,
            remaining_turns: null,
            remaining_days: null,
            applied_at: db.fn.now(),
          })
          .onConflict(["player_id", "effect_id"]) // если уникальный ключ, то игнорировать
          .ignore();
      }
    }
    const successful = results.filter((r) => r.success).length;
    const failed = results.length - successful;
    return {
      success: true,
      message: `Успешно: ${successful}, ошибок: ${failed}`,
      results,
    };
  },

  async addEffectsBatch(playerId: string, effectIds: number[]) {
    const player = await db("players").where("id", playerId).first();
    if (!player) throw new Error("Игрок не найден");

    const results = [];
    for (const effect_id of effectIds) {
      const effect = await db("effects").where("id", effect_id).first();
      if (!effect) {
        results.push({ effect_id, error: "Эффект не найден" });
        continue;
      }
      const existing = await db("player_active_effects")
        .where({ player_id: playerId, effect_id })
        .first();
      if (existing) {
        results.push({
          effect_id,
          success: true,
          message: "Эффект уже есть у игрока",
        });
        continue;
      }
      const [newEffect] = await db("player_active_effects")
        .insert({
          player_id: playerId,
          effect_id,
          source_type: "admin",
          source_id: null,
          remaining_turns: effect.duration_turns,
          remaining_days: effect.duration_days,
          applied_at: db.fn.now(),
        })
        .returning("*");
      results.push({
        effect_id,
        success: true,
        message: "Эффект добавлен",
        data: newEffect,
      });
    }
    return { success: true, message: "Операция завершена", results };
  },

  async removeItem(playerId: string, itemId: string) {
    const deleted = await db("player_items")
      .where({ player_id: playerId, item_id: itemId })
      .delete();
    if (deleted === 0) throw new Error("Предмет не найден у игрока");
    return true;
  },

  async removeAbility(playerId: string, abilityId: string) {
    const deleted = await db("player_abilities")
      .where({ player_id: playerId, ability_id: abilityId })
      .delete();
    if (deleted === 0) throw new Error("Способность не найдена у игрока");
    return true;
  },

  async removeEffect(playerId: string, effectId: string) {
    const deleted = await db("player_active_effects")
      .where({ player_id: playerId, effect_id: effectId, source_type: "admin" })
      .delete();
    if (deleted === 0)
      throw new Error("Эффект не найден или не может быть удален");
    return true;
  },

  async toggleEquip(playerId: string, itemId: string, is_equipped: boolean) {
    const [updated] = await db("player_items")
      .where({ player_id: playerId, item_id: itemId })
      .update({ is_equipped })
      .returning("*");
    if (!updated) throw new Error("Предмет не найден");
    return updated;
  },

  async toggleAbility(playerId: string, abilityId: string, is_active: boolean) {
    const [updated] = await db("player_abilities")
      .where({ player_id: playerId, ability_id: abilityId })
      .update({ is_active })
      .returning("*");
    if (!updated) throw new Error("Способность не найдена");
    return updated;
  },
};

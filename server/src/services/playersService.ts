// server/src/services/playersService.ts

import { db } from "../db/index.js";
import { getFullPlayerData } from "../utils/helpers.js";
import { playerAbilitiesService } from "./playerAbilitiesService.js";
import type { Player, FullPlayerData } from "../types/index.js";

export const playersService = {
  async getAll(
    card_shown_only?: boolean,
    available_for_selection?: boolean,
  ): Promise<Player[]> {
    let query = db("players").select("*");
    if (card_shown_only) {
      query = query.where("is_card_shown", true);
    }
    if (available_for_selection) {
      query = query.where("is_card_shown", true).whereNull("access_password");
    }
    return query;
  },

  async getById(id: number): Promise<Player | null> {
    return db("players").where({ id }).first();
  },

  async getFullDetails(id: number): Promise<FullPlayerData | null> {
    return getFullPlayerData(id.toString());
  },

  async loginWithPassword(password: string): Promise<Player | null> {
    const player = await db("players")
      .where({ access_password: password })
      .first();
    return player || null;
  },

  async create(data: Omit<Player, "id" | "created_at">): Promise<Player> {
    const [player] = await db("players")
      .insert({
        ...data,
        access_password: data.access_password ?? null,
      })
      .returning("*");
    return player;
  },

  async update(id: number, data: Partial<Player>): Promise<Player | null> {
    // Нормализация access_password: пустая строка → null
    if (data.access_password === "") {
      data.access_password = null;
    }
    const [updated] = await db("players")
      .where({ id })
      .update(data)
      .returning("*");
    return updated || null;
  },

  async delete(id: number): Promise<boolean> {
    const deleted = await db("players").where({ id }).delete();
    return deleted > 0;
  },

  // Batch операции
  async addItemsBatch(
    playerId: number,
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

  async setPassword(
    playerId: number,
    password: string,
  ): Promise<Player | null> {
    // Проверяем, существует ли игрок
    const player = await db("players").where({ id: playerId }).first();
    if (!player) throw new Error("Игрок не найден");

    // Проверяем, что пароль ещё не установлен
    if (player.access_password !== null) {
      throw new Error("Пароль уже установлен для этого игрока");
    }

    // Проверяем уникальность пароля среди всех игроков (где пароль не null)
    const existing = await db("players")
      .where({ access_password: password })
      .whereNotNull("access_password")
      .first();
    if (existing) {
      throw new Error("Этот пароль уже используется другим игроком");
    }

    // Устанавливаем пароль
    const [updated] = await db("players")
      .where({ id: playerId })
      .update({ access_password: password })
      .returning("*");
    return updated || null;
  },

  async addAbilitiesBatch(playerId: number, abilityIds: number[]) {
    const player = await db("players").where("id", playerId).first();
    if (!player) throw new Error("Игрок не найден");

    const results = [];
    for (const ability_id of abilityIds) {
      try {
        // Используем единый сервис для добавления способности игроку
        // По умолчанию is_active = true
        const playerAbility = await playerAbilitiesService.create(
          playerId,
          ability_id,
          true,
        );
        results.push({
          ability_id,
          success: true,
          action: playerAbility.obtained_at ? "created" : "updated",
          player_ability: playerAbility,
        });
      } catch (error: any) {
        results.push({
          ability_id,
          success: false,
          error: error.message,
        });
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

  async addEffectsBatch(playerId: number, effectIds: number[]) {
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

  async removeItem(playerId: number, itemId: number) {
    const deleted = await db("player_items")
      .where({ player_id: playerId, item_id: itemId })
      .delete();
    if (deleted === 0) throw new Error("Предмет не найден у игрока");
    return true;
  },

  async removeAbility(playerId: number, abilityId: number) {
    // Используем сервис для удаления связи (он сам удалит эффект, если способность пассивная)
    await playerAbilitiesService.delete(playerId, abilityId);
    return true;
  },

  async removeEffect(playerId: number, effectId: number) {
    const deleted = await db("player_active_effects")
      .where({ player_id: playerId, effect_id: effectId, source_type: "admin" })
      .delete();
    if (deleted === 0)
      throw new Error("Эффект не найден или не может быть удален");
    return true;
  },

  async toggleEquip(playerId: number, itemId: number, is_equipped: boolean) {
    const [updated] = await db("player_items")
      .where({ player_id: playerId, item_id: itemId })
      .update({ is_equipped })
      .returning("*");
    if (!updated) throw new Error("Предмет не найден");
    return updated;
  },

  async toggleAbility(playerId: number, abilityId: number, is_active: boolean) {
    // Используем сервис для обновления активности (он сам обновит эффект)
    const [updated] = await db("player_abilities")
      .where({ player_id: playerId, ability_id: abilityId })
      .update({ is_active })
      .returning("*");
    if (!updated) throw new Error("Способность не найдена");

    // Дополнительно: если способность пассивная, нужно обновить активный эффект
    // Вызовем playerAbilitiesService.create с новым is_active, чтобы он создал/удалил эффект
    await playerAbilitiesService.create(playerId, abilityId, is_active);

    return updated;
  },

  async updateAvatar(
    id: number,
    avatarUrl: string | null,
  ): Promise<Player | null> {
    const [updated] = await db("players")
      .where({ id })
      .update({ avatar_url: avatarUrl })
      .returning("*");
    return updated || null;
  },

  async deleteAvatar(id: number): Promise<Player | null> {
    // Получаем старый URL, чтобы удалить файл
    const player = await db("players").where({ id }).first();
    if (player?.avatar_url) {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), player.avatar_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    const [updated] = await db("players")
      .where({ id })
      .update({ avatar_url: null })
      .returning("*");
    return updated || null;
  },
};

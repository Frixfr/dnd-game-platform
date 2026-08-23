// server/src/services/playerItemsService.ts

import { db } from "../db/index.js";
import { logsService } from "./logsService.js";
import { playerEffectsService } from "./playerEffectsService.js";
import { itemsService } from "./itemsService.js";
import { getFullPlayerData } from "../utils/helpers.js";
import { emitPlayerUpdate } from "../socket/index.js";

export const playerItemsService = {
  async getAll(
    roomId: number,
    filters: {
      player_id?: number;
      item_id?: number;
      is_equipped?: boolean;
      with_details?: boolean;
    },
  ) {
    let query = db("player_items").select("*");
    if (filters.player_id) {
      const player = await db("players")
        .where({ id: filters.player_id, room_id: roomId })
        .first();
      if (!player) throw new Error("Игрок не найден в этой комнате");
      query = query.where("player_id", filters.player_id);
    }
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
    roomId: number,
    player_id: number,
    item_id: number,
    quantity: number,
    is_equipped: boolean,
  ) {
    const player = await db("players")
      .where({ id: player_id, room_id: roomId })
      .first();
    if (!player) throw new Error("Игрок не найден в этой комнате");
    const item = await itemsService.getById(roomId, item_id);
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
      await emitPlayerUpdate(player_id);
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
    await emitPlayerUpdate(player_id);
    return newItem;
  },

  async delete(roomId: number, player_id: number, item_id: number) {
    const player = await db("players")
      .where({ id: player_id, room_id: roomId })
      .first();
    if (!player) throw new Error("Игрок не найден в этой комнате");
    const deleted = await db("player_items")
      .where({ player_id, item_id })
      .delete();
    if (deleted === 0) throw new Error("Not found");
    await emitPlayerUpdate(player_id);
    return true;
  },

  async toggleEquip(roomId: number, id: number, is_equipped: boolean) {
    const [playerItem] = await db("player_items").where({ id }).returning("*");
    if (!playerItem) throw new Error("Not found");
    const player = await db("players")
      .where({ id: playerItem.player_id, room_id: roomId })
      .first();
    if (!player) throw new Error("Игрок не найден в этой комнате");

    const item = await itemsService.getById(roomId, playerItem.item_id);
    if (!item) throw new Error("Item not found");

    if (is_equipped) {
      const passiveEffects = (item.effects || []).filter(
        (e) => e.effect_type === "passive",
      );
      for (const effect of passiveEffects) {
        const existing = await db("player_active_effects")
          .where({
            player_id: playerItem.player_id,
            effect_id: effect.id,
            source_type: "item",
            source_id: item.id,
          })
          .first();
        if (!existing) {
          await playerEffectsService.create(roomId, {
            player_id: playerItem.player_id,
            effect_id: effect.id,
            source_type: "item",
            source_id: item.id,
            remaining_turns: effect.duration_turns,
            remaining_days: effect.duration_days,
          });
        }
      }
    } else {
      await db("player_active_effects")
        .where({
          player_id: playerItem.player_id,
          source_type: "item",
          source_id: item.id,
        })
        .delete();
    }

    const [updated] = await db("player_items")
      .where({ id })
      .update({ is_equipped })
      .returning("*");
    await emitPlayerUpdate(playerItem.player_id);
    return updated;
  },

  async useItem(roomId: number, playerId: number, playerItemId: number) {
    const player = await db("players")
      .where({ id: playerId, room_id: roomId })
      .first();
    if (!player) throw new Error("Игрок не найден в этой комнате");
    const playerItem = await db("player_items")
      .where({ id: playerItemId, player_id: playerId })
      .first();
    if (!playerItem) throw new Error("Предмет не найден у игрока");

    const item = await itemsService.getById(roomId, playerItem.item_id);
    if (!item) throw new Error("Предмет не найден");

    if (!item.is_usable) throw new Error("Этот предмет нельзя использовать");
    if (!item.infinite_uses && playerItem.quantity < 1)
      throw new Error("Недостаточно предметов");

    // Получаем текущее состояние игрока для проверки здоровья
    const fullPlayer = await getFullPlayerData(playerId);
    if (!fullPlayer) throw new Error("Не удалось загрузить данные игрока");

    const currentHealth = fullPlayer.final_stats.health;
    const currentMaxHealth = fullPlayer.final_stats.max_health;

    const activeEffects = (item.effects || []).filter(
      (e) => e.effect_type === "active",
    );

    // Определяем, есть ли у предмета лечебные эффекты и эффекты, повышающие max_health
    const hasHealEffect = activeEffects.some(
      (e) =>
        e.attribute === "health" &&
        typeof e.modifier === "number" &&
        e.modifier > 0,
    );
    const hasIncreaseMaxHealthEffect = activeEffects.some(
      (e) =>
        e.attribute === "max_health" &&
        typeof e.modifier === "number" &&
        e.modifier > 0,
    );

    // Если есть лечение, но нет увеличения максимума, и здоровье уже максимально – запретить
    if (
      hasHealEffect &&
      !hasIncreaseMaxHealthEffect &&
      currentHealth >= currentMaxHealth
    ) {
      throw new Error("Невозможно использовать: здоровье уже максимально");
    }

    for (const effect of activeEffects) {
      await playerEffectsService.create(roomId, {
        player_id: playerId,
        effect_id: effect.id,
        source_type: "item",
        source_id: item.id,
        remaining_turns: effect.duration_turns,
        remaining_days: effect.duration_days,
      });
    }

    if (!item.infinite_uses) {
      if (playerItem.quantity > 1) {
        await db("player_items")
          .where({ id: playerItemId })
          .update({ quantity: playerItem.quantity - 1 });
      } else {
        await db("player_items").where({ id: playerItemId }).delete();
      }
    }

    await logsService.create({
      action_type: "item_use",
      player_id: playerId,
      npc_id: null,
      entity_name: player.name,
      action_name: item.name,
      details: JSON.stringify({
        item_id: item.id,
        effects_applied: activeEffects.length,
      }),
      room_id: roomId,
    });

    await emitPlayerUpdate(playerId);
    return getFullPlayerData(playerId);
  },

  async discardItem(
    roomId: number,
    playerId: number,
    playerItemId: number,
    quantity?: number,
  ) {
    const player = await db("players")
      .where({ id: playerId, room_id: roomId })
      .first();
    if (!player) throw new Error("Игрок не найден в этой комнате");
    const playerItem = await db("player_items")
      .where({ id: playerItemId, player_id: playerId })
      .first();
    if (!playerItem) throw new Error("Предмет не найден");
    const item = await itemsService.getById(roomId, playerItem.item_id);
    if (!item) throw new Error("Предмет не найден");
    if (!item.is_deletable)
      throw new Error("Этот предмет нельзя выбросить или передать");
    if (playerItem.is_equipped) throw new Error("Сначала снимите предмет");

    const qtyToDiscard = quantity ?? playerItem.quantity;
    if (qtyToDiscard <= 0) throw new Error("Количество должно быть больше 0");
    if (qtyToDiscard > playerItem.quantity)
      throw new Error("Нельзя выбросить больше, чем есть");

    if (qtyToDiscard === playerItem.quantity) {
      await db("player_items").where({ id: playerItemId }).delete();
    } else {
      await db("player_items")
        .where({ id: playerItemId })
        .update({ quantity: playerItem.quantity - qtyToDiscard });
    }

    await logsService.create({
      action_type: "item_discard",
      player_id: playerId,
      npc_id: null,
      entity_name: player.name,
      action_name: item.name,
      details: JSON.stringify({ item_id: item.id, quantity: qtyToDiscard }),
      room_id: roomId,
    });

    await emitPlayerUpdate(playerId);
    return getFullPlayerData(playerId);
  },

  async transferItem(
    roomId: number,
    playerId: number,
    playerItemId: number,
    targetPlayerId: number,
    quantity: number = 1,
  ) {
    if (playerId === targetPlayerId)
      throw new Error("Нельзя передать предмет самому себе");

    const player = await db("players")
      .where({ id: playerId, room_id: roomId })
      .first();
    if (!player) throw new Error("Игрок не найден в этой комнате");
    const playerItem = await db("player_items")
      .where({ id: playerItemId, player_id: playerId })
      .first();
    if (!playerItem) throw new Error("Предмет не найден у отправителя");
    const item = await itemsService.getById(roomId, playerItem.item_id);
    if (!item) throw new Error("Предмет не найден");
    if (!item.is_deletable) throw new Error("Этот предмет нельзя передать");
    if (playerItem.is_equipped) throw new Error("Сначала снимите предмет");

    if (quantity <= 0) throw new Error("Количество должно быть больше 0");
    if (playerItem.quantity < quantity)
      throw new Error("Недостаточно предметов");

    const targetPlayer = await db("players")
      .where({ id: targetPlayerId, room_id: roomId })
      .first();
    if (!targetPlayer)
      throw new Error("Целевой игрок не найден в этой комнате");
    if (!targetPlayer.is_online) throw new Error("Игрок не в сети");

    await db.transaction(async (trx) => {
      if (playerItem.quantity === quantity) {
        await trx("player_items").where({ id: playerItemId }).delete();
      } else {
        await trx("player_items")
          .where({ id: playerItemId })
          .update({ quantity: playerItem.quantity - quantity });
      }
      const existing = await trx("player_items")
        .where({ player_id: targetPlayerId, item_id: playerItem.item_id })
        .first();
      if (existing) {
        await trx("player_items")
          .where({ id: existing.id })
          .update({ quantity: existing.quantity + quantity });
      } else {
        await trx("player_items").insert({
          player_id: targetPlayerId,
          item_id: playerItem.item_id,
          quantity: quantity,
          is_equipped: false,
          obtained_at: trx.fn.now(),
        });
      }
    });

    await logsService.create({
      action_type: "item_transfer",
      player_id: playerId,
      npc_id: null,
      entity_name: player.name,
      action_name: item.name,
      details: JSON.stringify({
        from: playerId,
        to: targetPlayerId,
        to_name: targetPlayer.name,
        item_id: item.id,
        quantity: quantity,
      }),
      room_id: roomId,
    });

    await emitPlayerUpdate(playerId);
    await emitPlayerUpdate(targetPlayerId);
    const [sender, target] = await Promise.all([
      getFullPlayerData(playerId),
      getFullPlayerData(targetPlayerId),
    ]);
    return { sender, target };
  },
};

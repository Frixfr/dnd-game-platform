import { db } from "../db/index.js";
import { logsService } from "./logsService.js";
import { playerEffectsService } from "./playerEffectsService.js";
import { itemsService } from "./itemsService.js";
import { getFullPlayerData } from "../utils/helpers.js";

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
    const item = await itemsService.getById(item_id);
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
    const [playerItem] = await db("player_items").where({ id }).returning("*");
    if (!playerItem) throw new Error("Not found");

    const item = await itemsService.getById(playerItem.item_id);
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
          await playerEffectsService.create({
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
    return updated;
  },

  async useItem(playerId: number, playerItemId: number) {
    const playerItem = await db("player_items")
      .where({ id: playerItemId, player_id: playerId })
      .first();
    if (!playerItem) throw new Error("Предмет не найден у игрока");

    const item = await itemsService.getById(playerItem.item_id);
    if (!item) throw new Error("Предмет не найден");

    if (!item.is_usable) throw new Error("Этот предмет нельзя использовать");
    if (!item.infinite_uses && playerItem.quantity < 1)
      throw new Error("Недостаточно предметов");

    const activeEffects = (item.effects || []).filter(
      (e) => e.effect_type === "active",
    );
    for (const effect of activeEffects) {
      await playerEffectsService.create({
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

    const player = await db("players").where("id", playerId).first();
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
    });

    return getFullPlayerData(playerId);
  },

  async discardItem(playerId: number, playerItemId: number) {
    const playerItem = await db("player_items")
      .where({ id: playerItemId, player_id: playerId })
      .first();
    if (!playerItem) throw new Error("Предмет не найден");
    const item = await itemsService.getById(playerItem.item_id);
    if (!item) throw new Error("Предмет не найден");
    if (!item.is_deletable)
      throw new Error("Этот предмет нельзя выбросить или передать");
    if (playerItem.is_equipped) throw new Error("Сначала снимите предмет");

    await db("player_items").where({ id: playerItemId }).delete();

    const player = await db("players").where("id", playerId).first();
    await logsService.create({
      action_type: "item_discard",
      player_id: playerId,
      npc_id: null,
      entity_name: player.name,
      action_name: item.name,
      details: JSON.stringify({ item_id: item.id }),
    });

    return getFullPlayerData(playerId);
  },

  async transferItem(
    playerId: number,
    playerItemId: number,
    targetPlayerId: number,
  ) {
    if (playerId === targetPlayerId)
      throw new Error("Нельзя передать предмет самому себе");

    const playerItem = await db("player_items")
      .where({ id: playerItemId, player_id: playerId })
      .first();
    if (!playerItem) throw new Error("Предмет не найден у отправителя");
    const item = await itemsService.getById(playerItem.item_id);
    if (!item) throw new Error("Предмет не найден");
    if (!item.is_deletable) throw new Error("Этот предмет нельзя передать");
    if (playerItem.is_equipped) throw new Error("Сначала снимите предмет");

    const targetPlayer = await db("players")
      .where("id", targetPlayerId)
      .first();
    if (!targetPlayer) throw new Error("Целевой игрок не найден");
    if (!targetPlayer.is_online) throw new Error("Игрок не в сети");

    await db.transaction(async (trx) => {
      if (playerItem.quantity > 1) {
        await trx("player_items")
          .where({ id: playerItemId })
          .update({ quantity: playerItem.quantity - 1 });
      } else {
        await trx("player_items").where({ id: playerItemId }).delete();
      }
      const existing = await trx("player_items")
        .where({ player_id: targetPlayerId, item_id: playerItem.item_id })
        .first();
      if (existing) {
        await trx("player_items")
          .where({ id: existing.id })
          .update({ quantity: existing.quantity + 1 });
      } else {
        await trx("player_items").insert({
          player_id: targetPlayerId,
          item_id: playerItem.item_id,
          quantity: 1,
          is_equipped: false,
          obtained_at: trx.fn.now(),
        });
      }
    });

    const player = await db("players").where("id", playerId).first();
    await logsService.create({
      action_type: "item_transfer",
      player_id: playerId,
      npc_id: null,
      entity_name: player.name,
      action_name: item.name,
      details: JSON.stringify({
        from: playerId,
        to: targetPlayerId,
        item_id: item.id,
      }),
    });

    const [sender, target] = await Promise.all([
      getFullPlayerData(playerId),
      getFullPlayerData(targetPlayerId),
    ]);
    return { sender, target };
  },
};

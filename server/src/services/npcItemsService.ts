// server/src/services/npcItemsService.ts
import { db } from "../db/index.js";
import { logsService } from "./logsService.js";
import { itemsService } from "./itemsService.js";
import { getFullNpcData, applyInstantHealthChange } from "../utils/helpers.js";

export const npcItemsService = {
  async getAll(
    roomId: number,
    filters: {
      npc_id?: number;
      item_id?: number;
      is_equipped?: boolean;
      with_details?: boolean;
    },
  ) {
    let query = db("npc_items").select("*");
    if (filters.npc_id) {
      const npc = await db("npcs")
        .where({ id: filters.npc_id, room_id: roomId })
        .first();
      if (!npc) throw new Error("NPC не найден в этой комнате");
      query = query.where("npc_id", filters.npc_id);
    }
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
    roomId: number,
    npc_id: number,
    item_id: number,
    quantity: number,
    is_equipped: boolean,
  ) {
    const npc = await db("npcs").where({ id: npc_id, room_id: roomId }).first();
    if (!npc) throw new Error("NPC не найден в этой комнате");
    const item = await itemsService.getById(roomId, item_id);
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

  async delete(roomId: number, npc_id: number, item_id: number) {
    const npc = await db("npcs").where({ id: npc_id, room_id: roomId }).first();
    if (!npc) throw new Error("NPC не найден в этой комнате");
    const deleted = await db("npc_items").where({ npc_id, item_id }).delete();
    if (deleted === 0) throw new Error("Not found");
    return true;
  },

  async toggleEquip(roomId: number, id: number, is_equipped: boolean) {
    const [npcItem] = await db("npc_items").where({ id }).returning("*");
    if (!npcItem) throw new Error("Not found");
    const npc = await db("npcs")
      .where({ id: npcItem.npc_id, room_id: roomId })
      .first();
    if (!npc) throw new Error("NPC не найден в этой комнате");

    const item = await itemsService.getById(roomId, npcItem.item_id);
    if (!item) throw new Error("Item not found");

    if (is_equipped) {
      const passiveEffects = (item.effects || []).filter(
        (e) => e.effect_type === "passive",
      );
      for (const effect of passiveEffects) {
        const existing = await db("npc_active_effects")
          .where({
            npc_id: npcItem.npc_id,
            effect_id: effect.id,
            source_type: "item",
            source_id: item.id,
          })
          .first();
        if (!existing) {
          await db("npc_active_effects").insert({
            npc_id: npcItem.npc_id,
            effect_id: effect.id,
            source_type: "item",
            source_id: item.id,
            remaining_turns: effect.duration_turns,
            remaining_days: effect.duration_days,
            applied_at: db.fn.now(),
          });
        }
      }
    } else {
      await db("npc_active_effects")
        .where({
          npc_id: npcItem.npc_id,
          source_type: "item",
          source_id: item.id,
        })
        .delete();
    }

    const [updated] = await db("npc_items")
      .where({ id })
      .update({ is_equipped })
      .returning("*");
    return updated;
  },

  async useItem(roomId: number, npcId: number, npcItemId: number) {
    const npc = await db("npcs").where({ id: npcId, room_id: roomId }).first();
    if (!npc) throw new Error("NPC не найден в этой комнате");
    const npcItem = await db("npc_items")
      .where({ id: npcItemId, npc_id: npcId })
      .first();
    if (!npcItem) throw new Error("Предмет не найден у NPC");

    const item = await itemsService.getById(roomId, npcItem.item_id);
    if (!item) throw new Error("Предмет не найден");

    if (!item.is_usable) throw new Error("Этот предмет нельзя использовать");
    if (!item.infinite_uses && npcItem.quantity < 1)
      throw new Error("Недостаточно предметов");

    const activeEffects = (item.effects || []).filter(
      (e) => e.effect_type === "active",
    );

    for (const effect of activeEffects) {
      // Мгновенные эффекты: применяем health-изменение, не создаём запись
      if (effect.is_instant) {
        if (
          effect.attribute === "health" ||
          effect.attribute === "max_health"
        ) {
          // Вычисляем effectiveMaxHealth
          const allActive = await db("npc_active_effects").where(
            "npc_id",
            npcId,
          );
          const allItems = await db("npc_items").where({
            npc_id: npcId,
            is_equipped: true,
          });
          let maxHealthBonus = 0;
          for (const ae of allActive) {
            if (
              ae.attribute === "max_health" &&
              typeof ae.modifier === "number"
            ) {
              maxHealthBonus += ae.modifier;
            }
          }
          for (const ni of allItems) {
            const i = await itemsService.getById(roomId, ni.item_id);
            if (i) {
              for (const pe of (i.effects || []).filter(
                (e) => e.effect_type === "passive",
              )) {
                if (
                  pe.attribute === "max_health" &&
                  typeof pe.modifier === "number"
                ) {
                  maxHealthBonus += pe.modifier;
                }
              }
            }
          }
          if (
            effect.attribute === "max_health" &&
            typeof effect.modifier === "number"
          ) {
            maxHealthBonus += effect.modifier;
          }
          const effectiveMaxHealth = (npc?.max_health ?? 0) + maxHealthBonus;
          const newHealth = applyInstantHealthChange(
            npc?.health ?? 0,
            effect,
            effectiveMaxHealth,
          );
          if (newHealth !== null && newHealth !== npc?.health) {
            await db("npcs").where("id", npcId).update({ health: newHealth });
          }
        }
        continue;
      }

      await db("npc_active_effects").insert({
        npc_id: npcId,
        effect_id: effect.id,
        source_type: "item",
        source_id: item.id,
        remaining_turns: effect.duration_turns,
        remaining_days: effect.duration_days,
        applied_at: db.fn.now(),
      });
    }

    if (!item.infinite_uses) {
      if (npcItem.quantity > 1) {
        await db("npc_items")
          .where({ id: npcItemId })
          .update({ quantity: npcItem.quantity - 1 });
      } else {
        await db("npc_items").where({ id: npcItemId }).delete();
      }
    }

    await logsService.create({
      action_type: "item_use",
      player_id: null,
      npc_id: npcId,
      entity_name: npc?.name || "NPC",
      action_name: item.name,
      details: JSON.stringify({
        item_id: item.id,
        effects_applied: activeEffects.length,
      }),
      room_id: roomId,
    });

    return getFullNpcData(npcId);
  },

  async discardItem(roomId: number, npcId: number, npcItemId: number) {
    const npc = await db("npcs").where({ id: npcId, room_id: roomId }).first();
    if (!npc) throw new Error("NPC не найден в этой комнате");
    const npcItem = await db("npc_items")
      .where({ id: npcItemId, npc_id: npcId })
      .first();
    if (!npcItem) throw new Error("Предмет не найден");
    const item = await itemsService.getById(roomId, npcItem.item_id);
    if (!item) throw new Error("Предмет не найден");
    if (!item.is_deletable) throw new Error("Этот предмет нельзя выбросить");
    if (npcItem.is_equipped) throw new Error("Сначала снимите предмет");

    await db("npc_items").where({ id: npcItemId }).delete();

    await logsService.create({
      action_type: "item_discard",
      player_id: null,
      npc_id: npcId,
      entity_name: npc.name,
      action_name: item.name,
      details: JSON.stringify({ item_id: item.id }),
      room_id: roomId,
    });

    return getFullNpcData(npcId);
  },

  async transferItem(
    roomId: number,
    npcId: number,
    npcItemId: number,
    targetNpcId: number,
  ) {
    if (npcId === targetNpcId)
      throw new Error("Нельзя передать предмет самому себе");

    const npc = await db("npcs").where({ id: npcId, room_id: roomId }).first();
    if (!npc) throw new Error("NPC не найден в этой комнате");
    const npcItem = await db("npc_items")
      .where({ id: npcItemId, npc_id: npcId })
      .first();
    if (!npcItem) throw new Error("Предмет не найден у отправителя");
    const item = await itemsService.getById(roomId, npcItem.item_id);
    if (!item) throw new Error("Предмет не найден");
    if (!item.is_deletable) throw new Error("Этот предмет нельзя передать");
    if (npcItem.is_equipped) throw new Error("Сначала снимите предмет");

    const targetNpc = await db("npcs")
      .where({ id: targetNpcId, room_id: roomId })
      .first();
    if (!targetNpc) throw new Error("Целевой NPC не найден в этой комнате");

    await db.transaction(async (trx) => {
      if (npcItem.quantity > 1) {
        await trx("npc_items")
          .where({ id: npcItemId })
          .update({ quantity: npcItem.quantity - 1 });
      } else {
        await trx("npc_items").where({ id: npcItemId }).delete();
      }
      const existing = await trx("npc_items")
        .where({ npc_id: targetNpcId, item_id: npcItem.item_id })
        .first();
      if (existing) {
        await trx("npc_items")
          .where({ id: existing.id })
          .update({ quantity: existing.quantity + 1 });
      } else {
        await trx("npc_items").insert({
          npc_id: targetNpcId,
          item_id: npcItem.item_id,
          quantity: 1,
          is_equipped: false,
          obtained_at: trx.fn.now(),
        });
      }
    });

    await logsService.create({
      action_type: "item_transfer",
      player_id: null,
      npc_id: npcId,
      entity_name: npc.name,
      action_name: item.name,
      details: JSON.stringify({
        from: npcId,
        to: targetNpcId,
        item_id: item.id,
      }),
      room_id: roomId,
    });

    const [sender, target] = await Promise.all([
      getFullNpcData(npcId),
      getFullNpcData(targetNpcId),
    ]);
    return { sender, target };
  },
};

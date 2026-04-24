import { db } from "../db/index.js";
import { getFullNpcData, ensureFrightenedEffect } from "../utils/helpers.js";
import type { NPC, FullNPCData, PaginatedResponse } from "../types/index.js";
import { npcAbilitiesService } from "./npcAbilitiesService.js";

export const npcsService = {
  async getAll(
    page?: number,
    limit?: number,
  ): Promise<NPC[] | PaginatedResponse<NPC>> {
    let query = db("npcs").select("*");

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

  async getById(id: string): Promise<NPC | null> {
    return db("npcs").where({ id }).first();
  },

  async getFullDetails(id: string): Promise<FullNPCData | null> {
    return getFullNpcData(id);
  },

  async create(data: Omit<NPC, "id" | "created_at">): Promise<NPC> {
    const [npc] = await db("npcs").insert(data).returning("*");
    return npc;
  },

  async update(id: string, data: Partial<NPC>): Promise<NPC | null> {
    const [updated] = await db("npcs")
      .where({ id })
      .update(data)
      .returning("*");
    return updated || null;
  },

  async delete(id: string): Promise<boolean> {
    const deleted = await db("npcs").where({ id }).delete();
    return deleted > 0;
  },

  async intimidate(npcId: string): Promise<{ npc: NPC }> {
    const npc = await db("npcs").where("id", npcId).first();
    if (!npc) throw new Error("NPC не найден");
    if (npc.aggression !== 0) {
      throw new Error(
        "Запугивание возможно только для спокойных NPC (aggression = 0)",
      );
    }

    const [updated] = await db("npcs")
      .where("id", npcId)
      .update({ aggression: 1 })
      .returning("*");
    const effect = await ensureFrightenedEffect();

    const existing = await db("npc_active_effects")
      .where({ npc_id: npcId, effect_id: effect.id })
      .first();
    if (!existing) {
      await db("npc_active_effects").insert({
        npc_id: npcId,
        effect_id: effect.id,
        source_type: "admin",
        source_id: null,
        remaining_turns: effect.duration_turns,
        remaining_days: effect.duration_days,
        applied_at: db.fn.now(),
      });
    }
    return { npc: updated };
  },

  async modifyAggression(npcId: string, delta: number): Promise<NPC> {
    const npc = await db("npcs").where("id", npcId).first();
    if (!npc) throw new Error("NPC не найден");
    if (npc.aggression !== 1) {
      throw new Error(
        "Изменение агрессии возможно только для напуганных NPC (aggression = 1)",
      );
    }
    const newAggression = npc.aggression + delta;
    if (newAggression < 0 || newAggression > 2) {
      throw new Error("Результат агрессии должен быть в диапазоне 0-2");
    }
    const [updated] = await db("npcs")
      .where("id", npcId)
      .update({ aggression: newAggression })
      .returning("*");
    return updated;
  },

  async calm(
    npcId: string,
    playerId?: number,
    abilityId?: number,
  ): Promise<NPC> {
    const npc = await db("npcs").where("id", npcId).first();
    if (!npc) throw new Error("NPC не найден");
    if (npc.aggression !== 2) {
      throw new Error(
        "Успокоение возможно только для агрессивных NPC (aggression = 2)",
      );
    }

    if (playerId && abilityId) {
      const ability = await db("abilities").where("id", abilityId).first();
      if (!ability || ability.name !== "Успокоение") {
        throw new Error(
          'У игрока нет способности "Успокоение" или она не найдена',
        );
      }
      const hasAbility = await db("player_abilities")
        .where({ player_id: playerId, ability_id: abilityId, is_active: true })
        .first();
      if (!hasAbility) {
        throw new Error('У игрока нет активной способности "Успокоение"');
      }
    } else if (playerId || abilityId) {
      throw new Error(
        "Для проверки способности нужно указать и playerId, и abilityId",
      );
    }

    const [updated] = await db("npcs")
      .where("id", npcId)
      .update({ aggression: 1 })
      .returning("*");
    return updated;
  },

  async setAggression(npcId: string, aggression: number): Promise<NPC> {
    const npc = await db("npcs").where("id", npcId).first();
    if (!npc) throw new Error("NPC не найден");
    const [updated] = await db("npcs")
      .where("id", npcId)
      .update({ aggression })
      .returning("*");
    return updated;
  },

  // Добавить в npcsService (после существующих методов)

  async addItemsBatch(
    npcId: number,
    items: { item_id: number; quantity: number }[],
  ) {
    const npc = await db("npcs").where("id", npcId).first();
    if (!npc) throw new Error("NPC не найден");

    const results = [];
    for (const { item_id, quantity = 1 } of items) {
      const item = await db("items").where("id", item_id).first();
      if (!item) {
        results.push({ item_id, error: "Предмет не найден" });
        continue;
      }
      const existing = await db("npc_items")
        .where({ npc_id: npcId, item_id })
        .first();
      if (existing) {
        const newQuantity = existing.quantity + quantity;
        const [updated] = await db("npc_items")
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
        const [newItem] = await db("npc_items")
          .insert({
            npc_id: npcId,
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

  async addAbilitiesBatch(npcId: number, abilityIds: number[]) {
    const npc = await db("npcs").where("id", npcId).first();
    if (!npc) throw new Error("NPC не найден");

    const results = [];
    for (const ability_id of abilityIds) {
      try {
        const npcAbility = await npcAbilitiesService.create(
          npcId,
          ability_id,
          true,
        );
        results.push({
          ability_id,
          success: true,
          action: npcAbility.obtained_at ? "created" : "updated",
          npc_ability: npcAbility,
        });
      } catch (error: unknown) {
        if (error instanceof Error) {
          results.push({
            ability_id,
            success: false,
            error: error.message,
          });
        } else {
          results.push({
            ability_id,
            success: false,
            error: "Неизвестная ошибка",
          });
        }
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

  async addEffectsBatch(npcId: number, effectIds: number[]) {
    const npc = await db("npcs").where("id", npcId).first();
    if (!npc) throw new Error("NPC не найден");

    const results = [];
    for (const effect_id of effectIds) {
      const effect = await db("effects").where("id", effect_id).first();
      if (!effect) {
        results.push({ effect_id, error: "Эффект не найден" });
        continue;
      }
      const existing = await db("npc_active_effects")
        .where({ npc_id: npcId, effect_id })
        .first();
      if (existing) {
        results.push({
          effect_id,
          success: true,
          message: "Эффект уже есть у NPC",
        });
        continue;
      }
      const [newEffect] = await db("npc_active_effects")
        .insert({
          npc_id: npcId,
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

  async removeItem(npcId: number, itemId: number) {
    const deleted = await db("npc_items")
      .where({ npc_id: npcId, item_id: itemId })
      .delete();
    if (deleted === 0) throw new Error("Предмет не найден у NPC");
    return true;
  },

  async removeAbility(npcId: number, abilityId: number) {
    await npcAbilitiesService.delete(npcId, abilityId);
    return true;
  },

  async removeEffect(npcId: number, effectId: number) {
    const deleted = await db("npc_active_effects")
      .where({ npc_id: npcId, effect_id: effectId, source_type: "admin" })
      .delete();
    if (deleted === 0)
      throw new Error("Эффект не найден или не может быть удален");
    return true;
  },

  async toggleEquip(npcId: number, itemId: number, is_equipped: boolean) {
    const [updated] = await db("npc_items")
      .where({ npc_id: npcId, item_id: itemId })
      .update({ is_equipped })
      .returning("*");
    if (!updated) throw new Error("Предмет не найден");
    return updated;
  },

  async toggleAbility(npcId: number, abilityId: number, is_active: boolean) {
    // Используем единый метод toggleActive из npcAbilitiesService
    const updated = await npcAbilitiesService.toggleActive(
      npcId,
      abilityId,
      is_active,
    );
    return updated;
  },

  async updateAvatar(
    id: number,
    avatarUrl: string | null,
  ): Promise<NPC | null> {
    const [updated] = await db("npcs")
      .where({ id })
      .update({ avatar_url: avatarUrl })
      .returning("*");
    return updated || null;
  },

  async deleteAvatar(id: number): Promise<NPC | null> {
    const npc = await db("npcs").where({ id }).first();
    if (npc?.avatar_url) {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), npc.avatar_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    const [updated] = await db("npcs")
      .where({ id })
      .update({ avatar_url: null })
      .returning("*");
    return updated || null;
  },

  async duplicate(id: string, newName: string): Promise<NPC> {
    // 1. Получить полные данные исходного NPC
    const originalFull = await getFullNpcData(id);
    if (!originalFull) throw new Error("Исходный NPC не найден");

    // 2. Проверить уникальность имени
    const existing = await db("npcs").where({ name: newName }).first();
    if (existing) throw new Error("NPC с таким именем уже существует");

    // 3. Копирование аватарки (если есть)
    let newAvatarUrl: string | null = null;
    if (originalFull.avatar_url) {
      const fs = await import("fs");
      const path = await import("path");
      const oldPath = path.join(process.cwd(), originalFull.avatar_url);
      const ext = path.extname(originalFull.avatar_url);
      const newFilename = `avatar-${Date.now()}-${Math.random().toString(36).substring(2, 10)}${ext}`;
      const newPath = path.join(process.cwd(), "uploads/avatars", newFilename);
      if (fs.existsSync(oldPath)) {
        fs.copyFileSync(oldPath, newPath);
        newAvatarUrl = `/uploads/avatars/${newFilename}`;
      }
    }

    // 4. Создать нового NPC с теми же базовыми данными
    const [newNpc] = await db("npcs")
      .insert({
        name: newName,
        gender: originalFull.gender,
        health: originalFull.health,
        max_health: originalFull.max_health,
        armor: originalFull.armor,
        strength: originalFull.strength,
        agility: originalFull.agility,
        intelligence: originalFull.intelligence,
        physique: originalFull.physique,
        wisdom: originalFull.wisdom,
        charisma: originalFull.charisma,
        history: originalFull.history,
        in_battle: originalFull.in_battle,
        is_online: originalFull.is_online,
        is_card_shown: originalFull.is_card_shown,
        aggression: originalFull.aggression,
        race_id: originalFull.race_id,
        avatar_url: newAvatarUrl,
      })
      .returning("*");

    // 5. Копировать предметы (npc_items)
    const originalItems = await db("npc_items").where({ npc_id: id });
    for (const item of originalItems) {
      await db("npc_items").insert({
        npc_id: newNpc.id,
        item_id: item.item_id,
        quantity: item.quantity,
        is_equipped: item.is_equipped,
        obtained_at: db.fn.now(),
      });
    }

    // 6. Копировать способности (npc_abilities)
    const originalAbilities = await db("npc_abilities").where({ npc_id: id });
    for (const ability of originalAbilities) {
      await db("npc_abilities").insert({
        npc_id: newNpc.id,
        ability_id: ability.ability_id,
        is_active: ability.is_active,
        remaining_cooldown_turns: ability.remaining_cooldown_turns,
        remaining_cooldown_days: ability.remaining_cooldown_days,
        obtained_at: db.fn.now(),
      });
    }

    // 7. Копировать активные эффекты (npc_active_effects) только от admin/ability/item (не боевые)
    const originalEffects = await db("npc_active_effects").where({
      npc_id: id,
    });
    for (const effect of originalEffects) {
      await db("npc_active_effects").insert({
        npc_id: newNpc.id,
        effect_id: effect.effect_id,
        source_type: effect.source_type,
        source_id: effect.source_id,
        remaining_turns: effect.remaining_turns,
        remaining_days: effect.remaining_days,
        applied_at: db.fn.now(),
      });
    }

    return newNpc;
  },
};

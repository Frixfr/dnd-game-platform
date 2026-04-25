// server/src/services/playersService.ts

import { db } from "../db/index.js";
import { getFullPlayerData, calculateFinalStats } from "../utils/helpers.js";
import { getIO, emitPlayerUpdate } from "../socket/index.js";
import { playerAbilitiesService } from "./playerAbilitiesService.js";
import type {
  Player,
  FullPlayerData,
  PaginatedResponse,
} from "../types/index.js";
import { playerItemsService } from "./playerItemsService.js";
import { logsService } from "./logsService.js";

export const playersService = {
  async getAll(
    card_shown_only?: boolean,
    available_for_selection?: boolean,
    page?: number,
    limit?: number,
  ): Promise<Player[] | PaginatedResponse<Player>> {
    let query = db("players").select("*");
    if (card_shown_only) {
      query = query.where("is_card_shown", true);
    }
    if (available_for_selection) {
      query = query.where("is_card_shown", true).whereNull("access_password");
    }

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

  async getAllFull(): Promise<FullPlayerData[]> {
    const players = await db("players").select("*");
    if (players.length === 0) return [];

    const playerIds = players.map((p) => p.id);

    const abilitiesRaw = await db("player_abilities")
      .whereIn("player_id", playerIds)
      .where("is_active", true)
      .join("abilities", "player_abilities.ability_id", "abilities.id")
      .leftJoin("effects", "abilities.effect_id", "effects.id")
      .select(
        "player_abilities.player_id",
        "abilities.id",
        "abilities.name",
        "abilities.description",
        "abilities.ability_type",
        "abilities.cooldown_turns",
        "abilities.cooldown_days",
        "abilities.effect_id",
        "abilities.created_at",
        "abilities.updated_at",
        "player_abilities.obtained_at",
        "player_abilities.is_active",
        "player_abilities.remaining_cooldown_turns",
        "effects.id as effect_id",
        "effects.name as effect_name",
        "effects.description as effect_description",
        "effects.attribute as effect_attribute",
        "effects.modifier as effect_modifier",
        "effects.duration_turns as effect_duration_turns",
        "effects.duration_days as effect_duration_days",
        "effects.is_permanent as effect_is_permanent",
      );

    const abilitiesByPlayer: Record<number, any[]> = {};
    for (const row of abilitiesRaw) {
      const playerId = row.player_id;
      if (!abilitiesByPlayer[playerId]) abilitiesByPlayer[playerId] = [];
      const {
        effect_id,
        effect_name,
        effect_description,
        effect_attribute,
        effect_modifier,
        effect_duration_turns,
        effect_duration_days,
        effect_is_permanent,
        ...ability
      } = row;
      const effect = effect_id
        ? {
            id: effect_id,
            name: effect_name,
            description: effect_description,
            attribute: effect_attribute,
            modifier: effect_modifier,
            duration_turns: effect_duration_turns,
            duration_days: effect_duration_days,
            is_permanent: effect_is_permanent,
          }
        : null;
      abilitiesByPlayer[playerId].push({ ...ability, effect });
    }

    const itemsRaw = await db("player_items")
      .whereIn("player_id", playerIds)
      .join("items", "player_items.item_id", "items.id")
      .leftJoin(
        "effects as active_effect",
        "items.active_effect_id",
        "active_effect.id",
      )
      .leftJoin(
        "effects as passive_effect",
        "items.passive_effect_id",
        "passive_effect.id",
      )
      .select(
        "player_items.player_id",
        "items.id",
        "items.name",
        "items.description",
        "items.rarity",
        "items.base_quantity",
        "items.active_effect_id",
        "items.passive_effect_id",
        "items.created_at",
        "items.updated_at",
        "player_items.quantity",
        "player_items.is_equipped",
        "player_items.obtained_at",
        "active_effect.name as active_effect_name",
        "active_effect.modifier as active_effect_modifier",
        "active_effect.attribute as active_effect_attribute",
        "active_effect.duration_turns as active_effect_duration_turns",
        "active_effect.duration_days as active_effect_duration_days",
        "active_effect.is_permanent as active_effect_is_permanent",
        "passive_effect.name as passive_effect_name",
        "passive_effect.modifier as passive_effect_modifier",
        "passive_effect.attribute as passive_effect_attribute",
        "passive_effect.duration_turns as passive_effect_duration_turns",
        "passive_effect.duration_days as passive_effect_duration_days",
        "passive_effect.is_permanent as passive_effect_is_permanent",
      );

    const itemsByPlayer: Record<number, any[]> = {};
    for (const row of itemsRaw) {
      const playerId = row.player_id;
      if (!itemsByPlayer[playerId]) itemsByPlayer[playerId] = [];
      const {
        active_effect_name,
        active_effect_modifier,
        active_effect_attribute,
        active_effect_duration_turns,
        active_effect_duration_days,
        active_effect_is_permanent,
        passive_effect_name,
        passive_effect_modifier,
        passive_effect_attribute,
        passive_effect_duration_turns,
        passive_effect_duration_days,
        passive_effect_is_permanent,
        ...item
      } = row;
      const activeEffect = active_effect_name
        ? {
            name: active_effect_name,
            modifier: active_effect_modifier,
            attribute: active_effect_attribute,
            duration_turns: active_effect_duration_turns,
            duration_days: active_effect_duration_days,
            is_permanent: active_effect_is_permanent,
          }
        : null;
      const passiveEffect = passive_effect_name
        ? {
            name: passive_effect_name,
            modifier: passive_effect_modifier,
            attribute: passive_effect_attribute,
            duration_turns: passive_effect_duration_turns,
            duration_days: passive_effect_duration_days,
            is_permanent: passive_effect_is_permanent,
          }
        : null;
      itemsByPlayer[playerId].push({
        ...item,
        active_effect: activeEffect,
        passive_effect: passiveEffect,
      });
    }

    const activeEffectsRaw = await db("player_active_effects")
      .whereIn("player_id", playerIds)
      .where(function () {
        this.where("remaining_turns", ">", 0)
          .orWhere("remaining_days", ">", 0)
          .orWhereNull("remaining_turns")
          .orWhereNull("remaining_days");
      })
      .join("effects", "player_active_effects.effect_id", "effects.id")
      .select(
        "player_active_effects.player_id",
        "effects.id",
        "effects.name",
        "effects.description",
        "effects.attribute",
        "effects.modifier",
        "effects.duration_turns",
        "effects.duration_days",
        "effects.is_permanent",
        "player_active_effects.source_type",
        "player_active_effects.source_id",
        "player_active_effects.remaining_turns",
        "player_active_effects.remaining_days",
        "player_active_effects.applied_at",
      );

    const activeEffectsByPlayer: Record<number, any[]> = {};
    for (const row of activeEffectsRaw) {
      const playerId = row.player_id;
      if (!activeEffectsByPlayer[playerId])
        activeEffectsByPlayer[playerId] = [];
      activeEffectsByPlayer[playerId].push({ ...row });
    }

    const playersWithRace = players.filter((p) => p.race_id !== null);
    let raceDataById: Record<
      number,
      { id: number; name: string; description: string | null; effects: any[] }
    > = {};

    if (playersWithRace.length > 0) {
      const raceIds = [...new Set(playersWithRace.map((p) => p.race_id!))];
      const races = await db("races").whereIn("id", raceIds).select("*");
      const raceEffectsRaw = await db("race_effects")
        .whereIn("race_id", raceIds)
        .join("effects", "race_effects.effect_id", "effects.id")
        .select("race_effects.race_id", "effects.*");
      const effectsByRace: Record<number, any[]> = {};
      for (const re of raceEffectsRaw) {
        if (!effectsByRace[re.race_id]) effectsByRace[re.race_id] = [];
        effectsByRace[re.race_id].push(re);
      }
      for (const race of races) {
        raceDataById[race.id] = {
          id: race.id,
          name: race.name,
          description: race.description,
          effects: effectsByRace[race.id] || [],
        };
      }
    }

    const result: FullPlayerData[] = [];
    for (const player of players) {
      const abilities = abilitiesByPlayer[player.id] || [];
      const items = itemsByPlayer[player.id] || [];
      const activeEffects = activeEffectsByPlayer[player.id] || [];

      let raceEffects: any[] = [];
      let raceData: any = null;
      if (player.race_id && raceDataById[player.race_id]) {
        raceData = raceDataById[player.race_id];
        raceEffects = raceData.effects;
      }

      const allActiveEffects = [...activeEffects, ...raceEffects];
      const allPassiveEffects = items.flatMap((item) => {
        if (item.passive_effect) return [item.passive_effect];
        return [];
      });
      const finalStats = calculateFinalStats(
        player,
        allActiveEffects,
        allPassiveEffects,
      );

      result.push({
        ...player,
        final_stats: finalStats,
        abilities,
        items,
        active_effects: activeEffects,
        race: raceData ? { ...raceData, effects: raceEffects } : null,
      });
    }
    return result;
  },

  async getAllFullPaginated(
    page: number,
    limit: number,
    card_shown_only?: boolean,
  ): Promise<PaginatedResponse<FullPlayerData>> {
    let query = db("players").select("*");
    if (card_shown_only) {
      query = query.where("is_card_shown", true);
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

    const players = await query.limit(limit).offset(offset);
    if (players.length === 0) {
      return { data: [], total, page, limit };
    }

    const playerIds = players.map((p) => p.id);

    const abilitiesRaw = await db("player_abilities")
      .whereIn("player_id", playerIds)
      .where("is_active", true)
      .join("abilities", "player_abilities.ability_id", "abilities.id")
      .leftJoin("effects", "abilities.effect_id", "effects.id")
      .select(
        "player_abilities.player_id",
        "abilities.id",
        "abilities.name",
        "abilities.description",
        "abilities.ability_type",
        "abilities.cooldown_turns",
        "abilities.cooldown_days",
        "abilities.effect_id",
        "abilities.created_at",
        "abilities.updated_at",
        "player_abilities.obtained_at",
        "player_abilities.is_active",
        "player_abilities.remaining_cooldown_turns",
        "effects.id as effect_id",
        "effects.name as effect_name",
        "effects.description as effect_description",
        "effects.attribute as effect_attribute",
        "effects.modifier as effect_modifier",
        "effects.duration_turns as effect_duration_turns",
        "effects.duration_days as effect_duration_days",
        "effects.is_permanent as effect_is_permanent",
      );

    const abilitiesByPlayer: Record<number, any[]> = {};
    for (const row of abilitiesRaw) {
      const playerId = row.player_id;
      if (!abilitiesByPlayer[playerId]) abilitiesByPlayer[playerId] = [];
      const {
        effect_id,
        effect_name,
        effect_description,
        effect_attribute,
        effect_modifier,
        effect_duration_turns,
        effect_duration_days,
        effect_is_permanent,
        ...ability
      } = row;
      const effect = effect_id
        ? {
            id: effect_id,
            name: effect_name,
            description: effect_description,
            attribute: effect_attribute,
            modifier: effect_modifier,
            duration_turns: effect_duration_turns,
            duration_days: effect_duration_days,
            is_permanent: effect_is_permanent,
          }
        : null;
      abilitiesByPlayer[playerId].push({ ...ability, effect });
    }

    const itemsRaw = await db("player_items")
      .whereIn("player_id", playerIds)
      .join("items", "player_items.item_id", "items.id")
      .select(
        "player_items.player_id",
        "items.id",
        "items.name",
        "items.description",
        "items.rarity",
        "items.base_quantity",
        "items.created_at",
        "items.updated_at",
        "player_items.quantity",
        "player_items.is_equipped",
        "player_items.obtained_at",
      );

    const allItemIds = itemsRaw.map((i) => i.id);
    const itemEffectsRaw = await db("item_effects")
      .whereIn("item_id", allItemIds)
      .join("effects", "item_effects.effect_id", "effects.id")
      .select(
        "item_effects.item_id",
        "item_effects.effect_type",
        "effects.id",
        "effects.name",
        "effects.description",
        "effects.attribute",
        "effects.modifier",
        "effects.duration_turns",
        "effects.duration_days",
        "effects.is_permanent",
        "effects.tags",
      );

    const effectsByItemId: Record<number, { active: any[]; passive: any[] }> =
      {};
    for (const effect of itemEffectsRaw) {
      if (!effectsByItemId[effect.item_id]) {
        effectsByItemId[effect.item_id] = { active: [], passive: [] };
      }
      const effectData = {
        id: effect.id,
        name: effect.name,
        description: effect.description,
        attribute: effect.attribute,
        modifier: effect.modifier,
        duration_turns: effect.duration_turns,
        duration_days: effect.duration_days,
        is_permanent: effect.is_permanent,
        tags: effect.tags ? JSON.parse(effect.tags) : [],
      };
      if (effect.effect_type === "active") {
        effectsByItemId[effect.item_id].active.push(effectData);
      } else {
        effectsByItemId[effect.item_id].passive.push(effectData);
      }
    }

    const itemsByPlayer: Record<number, any[]> = {};
    for (const row of itemsRaw) {
      const playerId = row.player_id;
      if (!itemsByPlayer[playerId]) itemsByPlayer[playerId] = [];
      const itemEffects = effectsByItemId[row.id] || {
        active: [],
        passive: [],
      };
      itemsByPlayer[playerId].push({
        ...row,
        active_effects: itemEffects.active,
        passive_effects: itemEffects.passive,
      });
    }

    const activeEffectsRawPag = await db("player_active_effects")
      .whereIn("player_id", playerIds)
      .where(function () {
        this.where("remaining_turns", ">", 0)
          .orWhere("remaining_days", ">", 0)
          .orWhereNull("remaining_turns")
          .orWhereNull("remaining_days");
      })
      .join("effects", "player_active_effects.effect_id", "effects.id")
      .select(
        "player_active_effects.player_id",
        "effects.id",
        "effects.name",
        "effects.description",
        "effects.attribute",
        "effects.modifier",
        "effects.duration_turns",
        "effects.duration_days",
        "effects.is_permanent",
        "effects.tags",
        "player_active_effects.source_type",
        "player_active_effects.source_id",
        "player_active_effects.remaining_turns",
        "player_active_effects.remaining_days",
        "player_active_effects.applied_at",
      );

    const activeEffectsByPlayerPag: Record<number, any[]> = {};
    for (const row of activeEffectsRawPag) {
      const playerId = row.player_id;
      if (!activeEffectsByPlayerPag[playerId])
        activeEffectsByPlayerPag[playerId] = [];
      activeEffectsByPlayerPag[playerId].push({
        ...row,
        tags: row.tags ? JSON.parse(row.tags) : [],
      });
    }

    const playersWithRacePag = players.filter((p) => p.race_id !== null);
    let raceDataByIdPag: Record<
      number,
      { id: number; name: string; description: string | null; effects: any[] }
    > = {};

    if (playersWithRacePag.length > 0) {
      const raceIds = [...new Set(playersWithRacePag.map((p) => p.race_id!))];
      const races = await db("races").whereIn("id", raceIds).select("*");
      const raceEffectsRawPag = await db("race_effects")
        .whereIn("race_id", raceIds)
        .join("effects", "race_effects.effect_id", "effects.id")
        .select("race_effects.race_id", "effects.*");
      const effectsByRacePag: Record<number, any[]> = {};
      for (const re of raceEffectsRawPag) {
        if (!effectsByRacePag[re.race_id]) effectsByRacePag[re.race_id] = [];
        effectsByRacePag[re.race_id].push({
          ...re,
          tags: re.tags ? JSON.parse(re.tags) : [],
        });
      }
      for (const race of races) {
        raceDataByIdPag[race.id] = {
          id: race.id,
          name: race.name,
          description: race.description,
          effects: effectsByRacePag[race.id] || [],
        };
      }
    }

    const result: FullPlayerData[] = [];
    for (const player of players) {
      const abilities = abilitiesByPlayer[player.id] || [];
      const items = itemsByPlayer[player.id] || [];
      const activeEffects = activeEffectsByPlayerPag[player.id] || [];

      let raceEffects: any[] = [];
      let raceData: any = null;
      if (player.race_id && raceDataByIdPag[player.race_id]) {
        raceData = raceDataByIdPag[player.race_id];
        raceEffects = raceData.effects;
      }

      const allActiveEffects = [...activeEffects, ...raceEffects];
      const allPassiveEffects = items.flatMap((item) => item.passive_effects);
      const finalStats = calculateFinalStats(
        player,
        allActiveEffects,
        allPassiveEffects,
      );

      result.push({
        ...player,
        final_stats: finalStats,
        abilities,
        items,
        active_effects: activeEffects,
        race: raceData ? { ...raceData, effects: raceEffects } : null,
      });
    }

    return { data: result, total, page, limit };
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
    await emitPlayerUpdate(player.id);
    return player;
  },

  async update(id: number, data: Partial<Player>): Promise<Player | null> {
    if (data.access_password === "") {
      data.access_password = null;
    }
    if (data.access_password !== undefined && data.access_password !== null) {
      const existing = await db("players")
        .where({ access_password: data.access_password })
        .whereNotNull("access_password")
        .whereNot("id", id)
        .first();
      if (existing) {
        throw new Error("Этот пароль уже используется другим игроком");
      }
    }
    const [updated] = await db("players")
      .where({ id })
      .update(data)
      .returning("*");
    if (updated) await emitPlayerUpdate(id);
    return updated || null;
  },

  async delete(id: number): Promise<boolean> {
    const deleted = await db("players").where({ id }).delete();
    if (deleted) getIO().emit("player:deleted", id);
    return deleted > 0;
  },

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
    await emitPlayerUpdate(playerId);
    return { success: true, message: "Операция завершена", results };
  },

  async setPassword(
    playerId: number,
    password: string,
  ): Promise<Player | null> {
    const player = await db("players").where({ id: playerId }).first();
    if (!player) throw new Error("Игрок не найден");
    if (player.access_password !== null) {
      throw new Error("Пароль уже установлен для этого игрока");
    }
    const existing = await db("players")
      .where({ access_password: password })
      .whereNotNull("access_password")
      .first();
    if (existing) {
      throw new Error("Этот пароль уже используется другим игроком");
    }
    const [updated] = await db("players")
      .where({ id: playerId })
      .update({ access_password: password })
      .returning("*");
    if (updated) await emitPlayerUpdate(playerId);
    return updated || null;
  },

  async addAbilitiesBatch(playerId: number, abilityIds: number[]) {
    const player = await db("players").where("id", playerId).first();
    if (!player) throw new Error("Игрок не найден");

    const results = [];
    for (const ability_id of abilityIds) {
      try {
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
    await emitPlayerUpdate(playerId);
    return {
      success: true,
      message: `Успешно: ${results.filter((r) => r.success).length}, ошибок: ${results.filter((r) => !r.success).length}`,
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
    await emitPlayerUpdate(playerId);
    return { success: true, message: "Операция завершена", results };
  },

  async removeItem(playerId: number, itemId: number) {
    const deleted = await db("player_items")
      .where({ player_id: playerId, item_id: itemId })
      .delete();
    if (deleted === 0) throw new Error("Предмет не найден у игрока");
    await emitPlayerUpdate(playerId);
    return true;
  },

  async removeAbility(playerId: number, abilityId: number) {
    await playerAbilitiesService.delete(playerId, abilityId);
    await emitPlayerUpdate(playerId);
    return true;
  },

  async removeEffect(playerId: number, effectId: number) {
    const deleted = await db("player_active_effects")
      .where({ player_id: playerId, effect_id: effectId, source_type: "admin" })
      .delete();
    if (deleted === 0)
      throw new Error("Эффект не найден или не может быть удален");
    await emitPlayerUpdate(playerId);
    return true;
  },

  async toggleEquip(playerId: number, itemId: number, is_equipped: boolean) {
    const [updated] = await db("player_items")
      .where({ player_id: playerId, item_id: itemId })
      .update({ is_equipped })
      .returning("*");
    if (!updated) throw new Error("Предмет не найден");
    await emitPlayerUpdate(playerId);
    return updated;
  },

  async toggleAbility(playerId: number, abilityId: number, is_active: boolean) {
    const updated = await playerAbilitiesService.toggleActive(
      playerId,
      abilityId,
      is_active,
    );
    await emitPlayerUpdate(playerId);
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
    if (updated) await emitPlayerUpdate(id);
    return updated || null;
  },

  async deleteAvatar(id: number): Promise<Player | null> {
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
    if (updated) await emitPlayerUpdate(id);
    return updated || null;
  },

  async useItem(playerId: number, playerItemId: number) {
    const player = await db("players").where({ id: playerId }).first();
    if (!player) throw new Error("Игрок не найден");

    const playerItem = await db("player_items")
      .where({ id: playerItemId, player_id: playerId })
      .first();
    if (!playerItem) throw new Error("Предмет не найден");
    const item = await db("items").where({ id: playerItem.item_id }).first();
    if (!item) throw new Error("Предмет не найден");

    const result = await playerItemsService.useItem(playerId, playerItemId);

    await logsService.create({
      action_type: "item_use",
      player_id: playerId,
      npc_id: null,
      entity_name: player.name,
      action_name: item.name,
      details: JSON.stringify({
        item_id: item.id,
        quantity_before: playerItem.quantity,
      }),
    });

    await emitPlayerUpdate(playerId);
    return result;
  },

  async useAbility(
    playerId: number,
    abilityId: number,
  ): Promise<{ success: boolean; message: string; effect?: any }> {
    return playerAbilitiesService.useAbility(playerId, abilityId);
  },
};

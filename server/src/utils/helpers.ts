// server/src/utils/helpers.ts

import { db } from "../db/index.js";
import { itemsService } from "../services/itemsService.js";
import type {
  Player,
  Effect,
  NPC,
  FullPlayerData,
  FullNPCData,
} from "../types/index.js";

// Безопасный парсинг JSON
function safeJsonParse(str: string | null, defaultValue: any = []) {
  if (!str) return defaultValue;
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

// Обобщённая функция расчёта финальных характеристик
export function calculateFinalStatsGeneric<
  T extends {
    health: number;
    max_health: number;
    armor: number;
    strength: number;
    agility: number;
    intelligence: number;
    physique: number;
    wisdom: number;
    charisma: number;
  },
>(
  entity: T,
  activeEffects: Effect[],
  passiveEffectsFromItems: Effect[],
): Pick<
  T,
  | "health"
  | "max_health"
  | "armor"
  | "strength"
  | "agility"
  | "intelligence"
  | "physique"
  | "wisdom"
  | "charisma"
> {
  const finalStats = { ...entity };

  activeEffects.forEach((effect) => {
    if (effect.attribute && typeof effect.modifier === "number") {
      const attr = effect.attribute as keyof typeof finalStats;
      const current = finalStats[attr];
      // Убеждаемся, что текущее значение - число
      if (typeof current === "number") {
        finalStats[attr] = (current + effect.modifier) as T[keyof T];
      }
    }
  });

  passiveEffectsFromItems.forEach((effect) => {
    if (effect.attribute && typeof effect.modifier === "number") {
      const attr = effect.attribute as keyof typeof finalStats;
      const current = finalStats[attr];
      if (typeof current === "number") {
        finalStats[attr] = (current + effect.modifier) as T[keyof T];
      }
    }
  });

  return finalStats;
}

export function calculateFinalStats(
  basePlayer: Player,
  activeEffects: Effect[],
  passiveEffectsFromItems: Effect[],
): Omit<
  Player,
  | "id"
  | "name"
  | "gender"
  | "history"
  | "in_battle"
  | "is_online"
  | "is_card_shown"
  | "created_at"
  | "race_id"
> {
  return calculateFinalStatsGeneric(
    basePlayer,
    activeEffects,
    passiveEffectsFromItems,
  );
}

export function calculateNpcFinalStats(
  baseNpc: NPC,
  activeEffects: Effect[],
  passiveEffectsFromItems: Effect[],
): Omit<
  NPC,
  | "id"
  | "name"
  | "gender"
  | "history"
  | "in_battle"
  | "is_online"
  | "is_card_shown"
  | "aggression"
  | "created_at"
  | "race_id"
> {
  return calculateFinalStatsGeneric(
    baseNpc,
    activeEffects,
    passiveEffectsFromItems,
  );
}

export async function getFullPlayerData(
  playerId: string | number,
): Promise<FullPlayerData | null> {
  try {
    const player = await db("players").where("id", playerId).first();
    if (!player) return null;

    // Способности
    const abilitiesRaw = await db("player_abilities")
      .where("player_id", playerId)
      .where("is_active", true)
      .join("abilities", "player_abilities.ability_id", "abilities.id")
      .leftJoin("effects", "abilities.effect_id", "effects.id")
      .select(
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
        "player_abilities.remaining_cooldown_days",
        "effects.id as effect_id",
        "effects.name as effect_name",
        "effects.description as effect_description",
        "effects.attribute as effect_attribute",
        "effects.modifier as effect_modifier",
        "effects.duration_turns as effect_duration_turns",
        "effects.duration_days as effect_duration_days",
        "effects.is_permanent as effect_is_permanent",
        "effects.tags as effect_tags",
      );

    const abilities = abilitiesRaw.map((row: any) => {
      const {
        effect_id,
        effect_name,
        effect_description,
        effect_attribute,
        effect_modifier,
        effect_duration_turns,
        effect_duration_days,
        effect_is_permanent,
        effect_tags,
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
            tags: safeJsonParse(effect_tags, []),
          }
        : null;
      return { ...ability, effect };
    });

    // Предметы
    const itemsRaw = await db("player_items")
      .where("player_id", playerId)
      .join("items", "player_items.item_id", "items.id")
      .select(
        "items.id",
        "items.name",
        "items.description",
        "items.rarity",
        "items.base_quantity",
        "items.is_deletable",
        "items.is_usable",
        "items.infinite_uses",
        "items.created_at",
        "items.updated_at",
        "player_items.quantity",
        "player_items.is_equipped",
        "player_items.obtained_at",
      );

    const items = await Promise.all(
      itemsRaw.map(async (item: any) => {
        const effects = await itemsService.getItemEffects(item.id);
        return {
          ...item,
          active_effects: effects.filter((e) => e.effect_type === "active"),
          passive_effects: effects.filter((e) => e.effect_type === "passive"),
        };
      }),
    );

    // Активные эффекты
    const activeEffectsRaw = await db("player_active_effects")
      .where("player_id", playerId)
      .where(function () {
        this.where("remaining_turns", ">", 0)
          .orWhere("remaining_days", ">", 0)
          .orWhereNull("remaining_turns")
          .orWhereNull("remaining_days");
      })
      .join("effects", "player_active_effects.effect_id", "effects.id")
      .select(
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

    const activeEffects = activeEffectsRaw.map((row: any) => ({
      ...row,
      tags: safeJsonParse(row.tags, []),
    }));

    // Эффекты расы
    let raceEffects: Effect[] = [];
    let raceData: {
      id: number;
      name: string;
      description: string | null;
    } | null = null;

    if (player.race_id) {
      const race = await db("races").where("id", player.race_id).first();
      if (race) {
        raceData = {
          id: race.id,
          name: race.name,
          description: race.description,
        };
        const raceEffectsRaw = await db("race_effects")
          .where("race_id", player.race_id)
          .join("effects", "race_effects.effect_id", "effects.id")
          .select("effects.*");
        raceEffects = raceEffectsRaw.map((e: any) => ({
          ...e,
          tags: safeJsonParse(e.tags, []),
        }));
      }
    }

    const allActiveEffects = [...activeEffects, ...raceEffects];
    const equippedPassiveEffects = items
      .filter((item) => item.is_equipped)
      .flatMap((item) => item.passive_effects);

    const finalStats = calculateFinalStats(
      player,
      allActiveEffects,
      equippedPassiveEffects,
    );

    return {
      ...player,
      final_stats: finalStats,
      abilities,
      items,
      active_effects: activeEffects,
      race: raceData ? { ...raceData, effects: raceEffects } : null,
    };
  } catch (error) {
    console.error("Ошибка в getFullPlayerData:", error);
    throw error;
  }
}

export async function getFullNpcData(
  npcId: string | number,
): Promise<FullNPCData | null> {
  try {
    const npc = await db("npcs").where("id", npcId).first();
    if (!npc) return null;

    // Способности
    const abilitiesRaw = await db("npc_abilities")
      .where("npc_id", npcId)
      .where("is_active", true)
      .join("abilities", "npc_abilities.ability_id", "abilities.id")
      .leftJoin("effects", "abilities.effect_id", "effects.id")
      .select(
        "abilities.id",
        "abilities.name",
        "abilities.description",
        "abilities.ability_type",
        "abilities.cooldown_turns",
        "abilities.cooldown_days",
        "abilities.effect_id",
        "abilities.created_at",
        "abilities.updated_at",
        "npc_abilities.obtained_at",
        "npc_abilities.is_active",
        "npc_abilities.remaining_cooldown_turns",
        "npc_abilities.remaining_cooldown_days",
        "effects.id as effect_id",
        "effects.name as effect_name",
        "effects.description as effect_description",
        "effects.attribute as effect_attribute",
        "effects.modifier as effect_modifier",
        "effects.duration_turns as effect_duration_turns",
        "effects.duration_days as effect_duration_days",
        "effects.is_permanent as effect_is_permanent",
        "effects.tags as effect_tags",
      );

    const abilities = abilitiesRaw.map((row: any) => {
      const {
        effect_id,
        effect_name,
        effect_description,
        effect_attribute,
        effect_modifier,
        effect_duration_turns,
        effect_duration_days,
        effect_is_permanent,
        effect_tags,
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
            tags: safeJsonParse(effect_tags, []),
          }
        : null;
      return { ...ability, effect };
    });

    // Предметы
    const itemsRaw = await db("npc_items")
      .where("npc_id", npcId)
      .join("items", "npc_items.item_id", "items.id")
      .select(
        "items.id",
        "items.name",
        "items.description",
        "items.rarity",
        "items.base_quantity",
        "items.is_deletable",
        "items.is_usable",
        "items.infinite_uses",
        "items.created_at",
        "items.updated_at",
        "npc_items.quantity",
        "npc_items.is_equipped",
        "npc_items.obtained_at",
      );

    const items = await Promise.all(
      itemsRaw.map(async (item: any) => {
        const effects = await itemsService.getItemEffects(item.id);
        return {
          ...item,
          active_effects: effects.filter((e) => e.effect_type === "active"),
          passive_effects: effects.filter((e) => e.effect_type === "passive"),
        };
      }),
    );

    // Активные эффекты
    const activeEffectsRaw = await db("npc_active_effects")
      .where("npc_id", npcId)
      .where(function () {
        this.where("remaining_turns", ">", 0)
          .orWhere("remaining_days", ">", 0)
          .orWhereNull("remaining_turns")
          .orWhereNull("remaining_days");
      })
      .join("effects", "npc_active_effects.effect_id", "effects.id")
      .select(
        "effects.id",
        "effects.name",
        "effects.description",
        "effects.attribute",
        "effects.modifier",
        "effects.duration_turns",
        "effects.duration_days",
        "effects.is_permanent",
        "effects.tags",
        "npc_active_effects.source_type",
        "npc_active_effects.source_id",
        "npc_active_effects.remaining_turns",
        "npc_active_effects.remaining_days",
        "npc_active_effects.applied_at",
      );

    const activeEffects = activeEffectsRaw.map((row: any) => ({
      ...row,
      tags: safeJsonParse(row.tags, []),
    }));

    // Эффекты расы
    let raceEffects: Effect[] = [];
    let raceData: {
      id: number;
      name: string;
      description: string | null;
    } | null = null;

    if (npc.race_id) {
      const race = await db("races").where("id", npc.race_id).first();
      if (race) {
        raceData = {
          id: race.id,
          name: race.name,
          description: race.description,
        };
        const raceEffectsRaw = await db("race_effects")
          .where("race_id", npc.race_id)
          .join("effects", "race_effects.effect_id", "effects.id")
          .select("effects.*");
        raceEffects = raceEffectsRaw.map((e: any) => ({
          ...e,
          tags: safeJsonParse(e.tags, []),
        }));
      }
    }

    const allActiveEffects = [...activeEffects, ...raceEffects];
    const equippedPassiveEffects = items
      .filter((item) => item.is_equipped)
      .flatMap((item) => item.passive_effects);

    const finalStats = calculateNpcFinalStats(
      npc,
      allActiveEffects,
      equippedPassiveEffects,
    );

    return {
      ...npc,
      final_stats: finalStats,
      abilities,
      items,
      active_effects: activeEffects,
      race: raceData ? { ...raceData, effects: raceEffects } : null,
    };
  } catch (error) {
    console.error("Ошибка в getFullNpcData:", error);
    throw error;
  }
}

export async function ensureFrightenedEffect(): Promise<Effect> {
  let effect = await db("effects").where("name", "Испуг").first();
  if (!effect) {
    const [newEffect] = await db("effects")
      .insert({
        name: "Испуг",
        description: "Цель испугана, её уровень агрессии повышен до 1",
        attribute: null,
        modifier: 0,
        duration_turns: 3,
        duration_days: null,
        is_permanent: false,
        tags: JSON.stringify([]),
      })
      .returning("*");
    effect = newEffect;
    console.log("Эффект 'Испуг' создан автоматически");
  }
  return effect;
}

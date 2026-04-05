// server/src/utils/helpers.ts

import { db } from "../db/index.js";
import type {
  Player,
  Effect,
  Item,
  NPC,
  FullPlayerData,
  FullNPCData,
} from "../types/index.js";

// Расчет финальных характеристик игрока
export function calculateFinalStats(
  basePlayer: Player,
  activeEffects: Effect[],
  items: (Item & { is_equipped: boolean; passive_effect?: Effect | null })[],
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
  const finalStats = {
    health: basePlayer.health,
    max_health: basePlayer.max_health,
    armor: basePlayer.armor,
    strength: basePlayer.strength,
    agility: basePlayer.agility,
    intelligence: basePlayer.intelligence,
    physique: basePlayer.physique,
    wisdom: basePlayer.wisdom,
    charisma: basePlayer.charisma,
  };

  activeEffects.forEach((effect) => {
    if (effect.attribute && effect.modifier) {
      const attr = effect.attribute as keyof typeof finalStats;
      if (finalStats[attr] !== undefined) {
        finalStats[attr] += effect.modifier;
      }
    }
  });

  items
    .filter((item) => item.is_equipped && item.passive_effect)
    .forEach((item) => {
      const effect = item.passive_effect!;
      if (effect.attribute && effect.modifier) {
        const attr = effect.attribute as keyof typeof finalStats;
        if (finalStats[attr] !== undefined) {
          finalStats[attr] += effect.modifier;
        }
      }
    });

  return finalStats;
}

// Расчет финальных характеристик NPC
export function calculateNpcFinalStats(
  baseNpc: NPC,
  activeEffects: Effect[],
  items: (Item & { is_equipped: boolean; passive_effect?: Effect | null })[],
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
  const finalStats = {
    health: baseNpc.health,
    max_health: baseNpc.max_health,
    armor: baseNpc.armor,
    strength: baseNpc.strength,
    agility: baseNpc.agility,
    intelligence: baseNpc.intelligence,
    physique: baseNpc.physique,
    wisdom: baseNpc.wisdom,
    charisma: baseNpc.charisma,
  };

  activeEffects.forEach((effect) => {
    if (effect.attribute && effect.modifier) {
      const attr = effect.attribute as keyof typeof finalStats;
      if (finalStats[attr] !== undefined) {
        finalStats[attr] += effect.modifier;
      }
    }
  });

  items
    .filter((item) => item.is_equipped && item.passive_effect)
    .forEach((item) => {
      const effect = item.passive_effect!;
      if (effect.attribute && effect.modifier) {
        const attr = effect.attribute as keyof typeof finalStats;
        if (finalStats[attr] !== undefined) {
          finalStats[attr] += effect.modifier;
        }
      }
    });

  return finalStats;
}

// Получение полных данных игрока (способности, предметы, активные эффекты)
export async function getFullPlayerData(
  playerId: string,
): Promise<FullPlayerData | null> {
  try {
    const player = await db("players").where("id", playerId).first();
    if (!player) return null;

    // 1. Способности с эффектами (исправлено для SQLite)
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
        "effects.id as effect_id",
        "effects.name as effect_name",
        "effects.description as effect_description",
        "effects.attribute as effect_attribute",
        "effects.modifier as effect_modifier",
        "effects.duration_turns as effect_duration_turns",
        "effects.duration_days as effect_duration_days",
        "effects.is_permanent as effect_is_permanent",
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
      return { ...ability, effect };
    });

    // 2. Предметы с активными и пассивными эффектами
    const itemsRaw = await db("player_items")
      .where("player_id", playerId)
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

    const items = itemsRaw.map((row: any) => {
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
      return {
        ...item,
        active_effect: activeEffect,
        passive_effect: passiveEffect,
      };
    });

    // 3. Активные эффекты (исправлено для SQLite)
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
        "player_active_effects.source_type",
        "player_active_effects.source_id",
        "player_active_effects.remaining_turns",
        "player_active_effects.remaining_days",
        "player_active_effects.applied_at",
      );

    const activeEffects = activeEffectsRaw.map((row: any) => ({ ...row }));

    // 4. Эффекты расы (если есть)
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
        raceEffects = raceEffectsRaw;
      }
    }

    const allActiveEffects = [...activeEffects, ...raceEffects];
    const finalStats = calculateFinalStats(
      player,
      allActiveEffects,
      items as any,
    );

    return {
      ...player,
      final_stats: finalStats,
      abilities,
      items,
      active_effects: activeEffects,
      race: raceData
        ? {
            ...raceData,
            effects: raceEffects,
          }
        : null,
    };
  } catch (error) {
    console.error("Ошибка в getFullPlayerData:", error);
    throw error;
  }
}

// Получение полных данных NPC (аналогичные исправления)
export async function getFullNpcData(
  npcId: string,
): Promise<FullNPCData | null> {
  try {
    const npc = await db("npcs").where("id", npcId).first();
    if (!npc) return null;

    // Способности NPC с эффектами
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
        "effects.id as effect_id",
        "effects.name as effect_name",
        "effects.description as effect_description",
        "effects.attribute as effect_attribute",
        "effects.modifier as effect_modifier",
        "effects.duration_turns as effect_duration_turns",
        "effects.duration_days as effect_duration_days",
        "effects.is_permanent as effect_is_permanent",
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
      return { ...ability, effect };
    });

    // Предметы NPC
    const itemsRaw = await db("npc_items")
      .where("npc_id", npcId)
      .join("items", "npc_items.item_id", "items.id")
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
        "items.id",
        "items.name",
        "items.description",
        "items.rarity",
        "items.base_quantity",
        "items.active_effect_id",
        "items.passive_effect_id",
        "items.created_at",
        "items.updated_at",
        "npc_items.quantity",
        "npc_items.is_equipped",
        "npc_items.obtained_at",
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

    const items = itemsRaw.map((row: any) => {
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
      return {
        ...item,
        active_effect: activeEffect,
        passive_effect: passiveEffect,
      };
    });

    // Активные эффекты NPC
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
        "npc_active_effects.source_type",
        "npc_active_effects.source_id",
        "npc_active_effects.remaining_turns",
        "npc_active_effects.remaining_days",
        "npc_active_effects.applied_at",
      );

    const activeEffects = activeEffectsRaw.map((row: any) => ({ ...row }));

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
        raceEffects = raceEffectsRaw;
      }
    }

    const allActiveEffects = [...activeEffects, ...raceEffects];
    const finalStats = calculateNpcFinalStats(
      npc,
      allActiveEffects,
      items as any,
    );

    return {
      ...npc,
      final_stats: finalStats,
      abilities,
      items,
      active_effects: activeEffects,
      race: raceData
        ? {
            ...raceData,
            effects: raceEffects,
          }
        : null,
    };
  } catch (error) {
    console.error("Ошибка в getFullNpcData:", error);
    throw error;
  }
}

// Проверка/создание эффекта "Испуг"
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
      })
      .returning("*");
    effect = newEffect;
    console.log("Эффект 'Испуг' создан автоматически");
  }
  return effect;
}

// client/src/types/index.ts
export type StatType =
  | "strength"
  | "agility"
  | "intelligence"
  | "physique"
  | "wisdom"
  | "charisma";

export interface PlayerType {
  id: number;
  name: string;
  gender: string;
  health: number;
  max_health: number;
  armor: number;
  strength: number;
  agility: number;
  intelligence: number;
  physique: number;
  wisdom: number;
  charisma: number;
  history: string;
  in_battle: boolean;
  is_online: boolean;
  is_card_shown: boolean;
  created_at?: string;
  abilities: PlayerAbilityExtended[]; // изменено с AbilityType[]
  items: PlayerItemExtended[]; // изменено с ItemType[]
  active_effects: PlayerEffectExtended[]; // изменено с EffectType[]
  race_id: number | null;
  access_password?: string;
  final_stats?: {
    health: number;
    max_health: number;
    armor: number;
    strength: number;
    agility: number;
    intelligence: number;
    physique: number;
    wisdom: number;
    charisma: number;
  };
  race?: RaceType;
  avatar_url?: string | null;
}

export interface NpcType {
  id: number;
  name: string;
  gender: "male" | "female";
  health: number;
  max_health: number;
  armor: number;
  strength: number;
  agility: number;
  intelligence: number;
  physique: number;
  wisdom: number;
  charisma: number;
  history: string | null;
  in_battle: boolean;
  is_online: boolean;
  is_card_shown: boolean;
  aggression: 0 | 1 | 2;
  created_at?: string;
  abilities: PlayerAbilityExtended[]; // изменено с optional AbilityType[] на обязательный расширенный
  items: PlayerItemExtended[]; // изменено с optional ItemType[] на обязательный расширенный
  active_effects: PlayerEffectExtended[]; // изменено с optional EffectType[] на обязательный расширенный
  race_id: number | null;
  final_stats?: {
    health: number;
    max_health: number;
    armor: number;
    strength: number;
    agility: number;
    intelligence: number;
    physique: number;
    wisdom: number;
    charisma: number;
  };
  race?: RaceType;
  avatar_url?: string | null;
}

export interface RaceType {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  effects?: EffectType[];
}

export interface AbilityType {
  id: number;
  name: string;
  description: string | null;
  ability_type: "active" | "passive";
  cooldown_turns: number;
  cooldown_days: number;
  effect_id: number | null;
  created_at: string;
  updated_at: string;
  is_active?: number;
}

export interface EffectType {
  id: number;
  name: string;
  description: string | null;
  attribute: string | null;
  modifier: number;
  duration_turns: number | null;
  duration_days: number | null;
  is_permanent: boolean;
  remaining_turns: number | null;
  tags: string[];
}

// Добавляем тип для редкости предметов
export type RarityType =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "mythical"
  | "story";

// Основной интерфейс предмета
export interface ItemType {
  id: number;
  name: string;
  description: string | null;
  rarity: RarityType;
  base_quantity: number;
  active_effect_id: number | null;
  passive_effect_id: number | null;
  created_at?: string;
  updated_at?: string;
  quantity?: number;
  is_equipped?: number;
  active_effect_name?: string | null;
  passive_effect_name?: string | null;
}

// Расширенный тип предмета с загруженными эффектами
export type ItemWithEffects = ItemType & {
  active_effect?: EffectType | null;
  passive_effect?: EffectType | null;
};

// Тип для способности с загруженным эффектом
export type AbilityWithEffect = AbilityType & {
  effect?: EffectType | null;
};

// Дополнительные типы для будущего расширения
export interface InventoryItem {
  id: number;
  name: string;
  type: "weapon" | "armor" | "consumable" | "other";
  description?: string;
}

// Расширенный тип способности (с полями из player_abilities)
export interface PlayerAbilityExtended extends AbilityType {
  is_active: number; // 0 или 1, как в AbilityType
  effect?: EffectType | null;
}

// Расширенный тип предмета (с полями из player_items)
export interface PlayerItemExtended extends ItemType {
  quantity: number;
  is_equipped: number; // 0 или 1 (в БД и API используется number)
  active_effect?: EffectType | null;
  passive_effect?: EffectType | null;
}

// Расширенный тип активного эффекта
export interface PlayerEffectExtended extends EffectType {
  source_type: "ability" | "item" | "admin";
  source_id: number | null;
  remaining_turns: number | null;
  remaining_days: number | null;
  applied_at: string;
}

// Combat types
export interface CombatSession {
  id: number;
  is_active: boolean;
  created_at: string;
  ended_at: string | null;
}

export interface CombatParticipant {
  id: number;
  session_id: number;
  entity_type: "player" | "npc";
  entity_id: number;
  order_index: number;
  is_current_turn: boolean;
  joined_at: string;
}

export interface CombatParticipantWithDetails extends CombatParticipant {
  entity: PlayerType | NpcType;
}

export interface Log {
  id: number;
  action_type: "ability_use" | "item_use" | "effect_gain";
  player_id: number | null;
  npc_id: number | null;
  entity_name: string;
  action_name: string;
  details: string | null;
  created_at: string;
}

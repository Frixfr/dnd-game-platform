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
  abilities: PlayerAbilityExtended[];
  items: PlayerItemExtended[];
  active_effects: PlayerEffectExtended[];
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
  abilities: PlayerAbilityExtended[];
  items: PlayerItemExtended[];
  active_effects: PlayerEffectExtended[];
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

export type RarityType =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "mythical"
  | "story";

export interface ItemType {
  id: number;
  name: string;
  description: string | null;
  rarity: RarityType;
  base_quantity: number;
  created_at?: string;
  updated_at?: string;
  quantity?: number;
  is_equipped?: number;
  is_deletable: boolean;
  is_usable: boolean;
  infinite_uses: boolean;
  active_effects?: EffectType[];
  passive_effects?: EffectType[];
}

export type ItemWithEffects = ItemType & {
  active_effect?: EffectType | null;
  passive_effect?: EffectType | null;
};

export type AbilityWithEffect = AbilityType & {
  effect?: EffectType | null;
};

export interface InventoryItem {
  id: number;
  name: string;
  type: "weapon" | "armor" | "consumable" | "other";
  description?: string;
}

export interface PlayerAbilityExtended extends AbilityType {
  is_active: number;
  effect?: EffectType | null;
  remaining_cooldown_turns?: number;
}

export interface PlayerItemExtended extends ItemType {
  quantity: number;
  is_equipped: number;
  player_item_id: number;
  active_effect?: EffectType | null;
  passive_effect?: EffectType | null;
}

export interface PlayerEffectExtended extends EffectType {
  source_type: "ability" | "item" | "admin";
  source_id: number | null;
  remaining_turns: number | null;
  remaining_days: number | null;
  applied_at: string;
}

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
  action_type:
    | "ability_use"
    | "item_use"
    | "effect_gain"
    | "item_transfer"
    | "item_discard";
  player_id: number | null;
  npc_id: number | null;
  entity_name: string;
  action_name: string;
  details: string | null;
  created_at: string;
}

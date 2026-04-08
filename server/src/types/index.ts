// server/src/types/index.ts

export interface Player {
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
  created_at: string;
  race_id: number | null;
  access_password?: string | null;
}

export interface Effect {
  id: number;
  name: string;
  description: string | null;
  attribute:
    | keyof Omit<
        Player,
        | "id"
        | "name"
        | "gender"
        | "history"
        | "in_battle"
        | "is_online"
        | "is_card_shown"
        | "created_at"
      >
    | null;
  modifier: number;
  duration_turns: number | null;
  duration_days: number | null;
  is_permanent: boolean;
  tags: string[];
}

export interface Ability {
  id: number;
  name: string;
  description: string | null;
  ability_type: "active" | "passive";
  cooldown_turns: number;
  cooldown_days: number;
  effect_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: number;
  name: string;
  description: string | null;
  rarity:
    | "common"
    | "uncommon"
    | "rare"
    | "epic"
    | "legendary"
    | "mythical"
    | "story";
  base_quantity: number;
  active_effect_id: number | null;
  passive_effect_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface NPC {
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
  created_at: string;
  race_id: number | null;
}

export interface PlayerAbility {
  player_id: number;
  ability_id: number;
  obtained_at: string;
  is_active: boolean;
}

export interface PlayerItem {
  id: number;
  player_id: number;
  item_id: number;
  quantity: number;
  is_equipped: boolean;
  obtained_at: string;
}

export interface PlayerActiveEffect {
  id: number;
  player_id: number;
  effect_id: number;
  source_type: "ability" | "item" | "admin";
  source_id: number | null;
  remaining_turns: number | null;
  remaining_days: number | null;
  applied_at: string;
}

export interface NpcAbility {
  npc_id: number;
  ability_id: number;
  obtained_at: string;
  is_active: boolean;
}

export interface NpcItem {
  id: number;
  npc_id: number;
  item_id: number;
  quantity: number;
  is_equipped: boolean;
  obtained_at: string;
}

export interface NpcActiveEffect {
  id: number;
  npc_id: number;
  effect_id: number;
  source_type: "ability" | "item" | "admin";
  source_id: number | null;
  remaining_turns: number | null;
  remaining_days: number | null;
  applied_at: string;
}

// Расширенные типы для ответов API
export interface FullPlayerData extends Player {
  final_stats: Omit<
    Player,
    | "id"
    | "name"
    | "gender"
    | "history"
    | "in_battle"
    | "is_online"
    | "is_card_shown"
    | "created_at"
  >;
  abilities: (Ability & { effect?: Effect | null; is_active: boolean })[];
  items: (Item & {
    quantity: number;
    is_equipped: boolean;
    active_effect?: Effect | null;
    passive_effect?: Effect | null;
  })[];
  active_effects: (Effect & {
    source_type: string;
    source_id: number | null;
    remaining_turns: number | null;
    remaining_days: number | null;
    applied_at: string;
  })[];
  race?: Race & { effects: Effect[] };
}

export interface FullNPCData extends NPC {
  final_stats: Omit<
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
  >;
  abilities: (Ability & { effect?: Effect | null; is_active: boolean })[];
  items: (Item & {
    quantity: number;
    is_equipped: boolean;
    active_effect?: Effect | null;
    passive_effect?: Effect | null;
  })[];
  active_effects: (Effect & {
    source_type: string;
    source_id: number | null;
    remaining_turns: number | null;
    remaining_days: number | null;
    applied_at: string;
  })[];
  race?: Race & { effects: Effect[] };
}

export interface Race {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface RaceEffect {
  race_id: number;
  effect_id: number;
}

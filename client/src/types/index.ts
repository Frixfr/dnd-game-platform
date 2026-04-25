// client/src/types/index.ts

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
  avatar_url?: string | null;
}

// Тип для финальных характеристик (общий для игроков и NPC)
export type FinalStats = Pick<
  Player,
  | "health"
  | "max_health"
  | "armor"
  | "strength"
  | "agility"
  | "intelligence"
  | "physique"
  | "wisdom"
  | "charisma"
>;

// Тип для использования на фронте (может содержать final_stats и другие расширенные поля)
export type PlayerType = Player & {
  final_stats?: FinalStats;
  race?: Race & { effects: Effect[] };
  abilities?: PlayerAbilityExtended[];
  items?: PlayerItemExtended[];
  active_effects?: PlayerEffectExtended[];
};

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
  is_deletable: boolean;
  is_usable: boolean;
  infinite_uses: boolean;
  effects?: (Effect & { effect_type: "active" | "passive" })[];
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
  avatar_url?: string | null;
}

export interface PlayerAbility {
  player_id: number;
  ability_id: number;
  obtained_at: string;
  is_active: boolean;
  remaining_cooldown_turns?: number | null;
  remaining_cooldown_days?: number | null;
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
  remaining_cooldown_turns?: number | null;
  remaining_cooldown_days?: number | null;
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
  final_stats: FinalStats;
  abilities: PlayerAbilityExtended[];
  items: PlayerItemExtended[];
  active_effects: PlayerEffectExtended[];
  race?: Race & { effects: Effect[] };
}

export interface FullNPCData extends NPC {
  final_stats: FinalStats;
  abilities: (Ability & {
    effect?: Effect | null;
    is_active: boolean;
    remaining_cooldown_turns?: number | null;
    remaining_cooldown_days?: number | null;
  })[];
  items: (Item & {
    npc_item_id?: number;
    quantity: number;
    is_equipped: boolean;
    active_effect?: Effect | null;
    passive_effects?: (Effect & { source_item_name: string })[];
  })[];
  active_effects: (Effect & {
    source_type: string;
    source_id: number | null;
    source_name?: string | null;
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
  effects?: Effect[];
}

export interface RaceEffect {
  race_id: number;
  effect_id: number;
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

export interface Log {
  id: number;
  action_type:
    | "ability_use"
    | "item_use"
    | "effect_gain"
    | "item_discard"
    | "item_transfer";
  player_id: number | null;
  npc_id: number | null;
  entity_name: string;
  action_name: string;
  details: string | null;
  created_at: string;
}

// Расширенный участник боя с данными сущности
export interface CombatParticipantWithDetails extends CombatParticipant {
  entity: FullPlayerData | FullNPCData;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ItemEffectLink {
  id: number;
  item_id: number;
  effect_id: number;
  effect_type: "active" | "passive";
  created_at: string;
}

export interface Map {
  id: number;
  name: string;
  image_url: string;
  show_to_players: boolean;
  original_width: number; // добавить
  original_height: number; // добавить
  created_at: string;
  updated_at: string;
}

export interface MapToken {
  id: number;
  map_id: number;
  entity_type: "player" | "npc";
  entity_id: number;
  x: number; // 0..1
  y: number; // 0..1
  is_grayscale: boolean;
  scale: number;
  updated_at: string;
}

export interface MapWithTokens extends Map {
  tokens: (MapToken & { entity_name: string; avatar_url?: string | null })[];
}

export interface CreateMapDto {
  name: string;
  show_to_players?: boolean;
}

export interface UpdateMapDto {
  name?: string;
  show_to_players?: boolean;
}

export interface UpdateTokenDto {
  x?: number;
  y?: number;
  is_grayscale?: boolean;
  scale?: number;
}

// Расширенные типы для связей игроков (используются в менеджерах)
export interface PlayerAbilityExtended extends Ability {
  effect?: Effect | null;
  is_active: boolean;
  remaining_cooldown_turns?: number | null;
  remaining_cooldown_days?: number | null;
  obtained_at: string;
}

export interface PlayerItemExtended extends Item {
  player_item_id?: number;
  quantity: number;
  is_equipped: boolean;
  obtained_at: string;
  active_effects?: Effect[];
  passive_effects?: (Effect & { source_item_name: string })[];
}

export interface PlayerEffectExtended extends Effect {
  source_type: string;
  source_id: number | null;
  source_name?: string | null;
  remaining_turns: number | null;
  remaining_days: number | null;
  applied_at: string;
}

// Алиасы для удобства использования на фронте (суффикс Type)
export type MapType = Map;
export type MapWithTokensType = MapWithTokens;
export type MapTokenType = MapToken;

// Доступные сущности для добавления на карту
export interface AvailableEntities {
  players: Array<{ id: number; name: string; avatar_url?: string | null }>;
  npcs: Array<{ id: number; name: string; avatar_url?: string | null }>;
}

// Алиасы для способностей, эффектов и рас (для удобства)
export type AbilityType = Ability;
export type EffectType = Effect;
export type ItemType = Item;
export type RaceType = Race;

export type RarityType = Item["rarity"];

export type NpcType = NPC;
export type StatType = keyof Pick<
  NPC,
  "strength" | "agility" | "intelligence" | "physique" | "wisdom" | "charisma"
>;

export type NpcItemExtended = FullNPCData["items"][0];
export type NpcAbilityExtended = FullNPCData["abilities"][0];
export type NpcEffectExtended = FullNPCData["active_effects"][0];

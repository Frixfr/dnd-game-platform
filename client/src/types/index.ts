// client/src/types/index.ts
export type StatType = 'strength' | 'agility' | 'intelligence' | 'physique' | 'wisdom' | 'charisma';

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
}

export interface AbilityType {
  id: number;
  name: string;
  description: string | null;
  ability_type: 'active' | 'passive';
  cooldown_turns: number;
  cooldown_days: number;
  effect_id: number | null;
  created_at: string;
  updated_at: string;
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
}

// Тип для способности с загруженным эффектом
export type AbilityWithEffect = AbilityType & {
  effect?: EffectType;
};

// Дополнительные типы для будущего расширения
export interface InventoryItem {
  id: number;
  name: string;
  type: 'weapon' | 'armor' | 'consumable' | 'other';
  description?: string;
}

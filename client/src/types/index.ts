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

// Добавляем тип для редкости предметов
export type RarityType = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythical' | 'story';

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
  type: 'weapon' | 'armor' | 'consumable' | 'other';
  description?: string;
}

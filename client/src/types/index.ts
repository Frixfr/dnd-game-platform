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

// Дополнительные типы для будущего расширения
export interface InventoryItem {
  id: number;
  name: string;
  type: 'weapon' | 'armor' | 'consumable' | 'other';
  description?: string;
}

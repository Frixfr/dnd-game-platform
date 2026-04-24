// client/src/components/ui/CombatantCard.tsx
import { useState } from "react";
import type { CombatParticipantWithDetails } from "../../types";

// Общий тип для способности в бою (совместим с PlayerAbilityExtended и NPC ability)
interface CombatAbility {
  id: number;
  name: string;
  description: string | null;
  ability_type: "active" | "passive";
  cooldown_turns: number;
  cooldown_days: number;
  effect_id: number | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  remaining_cooldown_turns?: number | null;
  remaining_cooldown_days?: number | null;
}

interface CombatantCardProps {
  participant: CombatParticipantWithDetails;
  isCurrentTurn: boolean;
  onHealthChange: (newHealth: number) => void;
  onAddEffect: () => void;
  onRemove: () => void;
  onUseAbility: (abilityId: number) => Promise<void>;
  onEdit: () => void;
}

export const CombatantCard = ({
  participant,
  isCurrentTurn,
  onHealthChange,
  onAddEffect,
  onRemove,
  onUseAbility,
  onEdit,
}: CombatantCardProps) => {
  const entity = participant.entity;
  const healthPercent = (entity.health / entity.max_health) * 100;
  const isDead = entity.health <= 0;
  const entityName = entity.name;
  const entityTypeLabel = participant.entity_type === "player" ? "Игрок" : "NPC";
  const avatarUrl = entity.avatar_url;
  const [healthInput, setHealthInput] = useState(entity.health.toString());
  const [showStats, setShowStats] = useState(false);
  const [showAbilities, setShowAbilities] = useState(false);

  // Приводим abilities к общему типу (данные с бэка совместимы по нужным полям)
  const abilities = entity.abilities as unknown as CombatAbility[];
  const activeAbilities = abilities.filter(a => a.ability_type === "active");
  const passiveAbilities = abilities.filter(a => a.ability_type === "passive");

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) {
      return;
    }
    onEdit();
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-md p-4 transition-all cursor-grab active:cursor-grabbing ${
        isCurrentTurn ? "ring-2 ring-blue-500 shadow-lg" : ""
      } ${isDead ? "bg-gray-300 opacity-70" : ""}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", participant.id.toString());
        e.currentTarget.style.opacity = "0.5";
      }}
      onDragEnd={(e) => {
        e.currentTarget.style.opacity = "1";
      }}
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={entityName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl">
              {participant.entity_type === "player" ? "👤" : "👹"}
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-gray-800">{entityName}</h3>
              <span className="text-xs text-gray-500">{entityTypeLabel}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="text-gray-400 hover:text-red-500 text-xl leading-none"
              title="Удалить из боя"
            >
              ×
            </button>
          </div>

          {/* Броня */}
          <div className="mt-1 flex justify-between items-center text-sm">
            <span className="text-gray-600">🛡️ Броня</span>
            <span className="font-semibold">{entity.armor}</span>
          </div>

          {/* Здоровье */}
          <div className="mt-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>❤️ Здоровье</span>
              <span>
                {entity.health}/{entity.max_health}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-red-500 transition-all"
                style={{ width: `${Math.max(0, healthPercent)}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <input
                type="number"
                value={healthInput}
                onChange={(e) => setHealthInput(e.target.value)}
                className="w-20 px-2 py-1 text-sm border rounded"
                min="0"
                max={entity.max_health}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newHealth = parseInt(healthInput, 10);
                  if (!isNaN(newHealth)) onHealthChange(newHealth);
                }}
                className="text-xs bg-blue-100 px-2 py-1 rounded hover:bg-blue-200"
              >
                Установить
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddEffect();
                }}
                className="text-xs bg-purple-100 px-2 py-1 rounded hover:bg-purple-200"
              >
                Эффект
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStats(!showStats);
                }}
                className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
              >
                {showStats ? "Скрыть статы" : "Статы"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAbilities(!showAbilities);
                }}
                className="text-xs bg-indigo-100 px-2 py-1 rounded hover:bg-indigo-200"
              >
                {showAbilities ? "Скрыть способности" : "Способности"}
              </button>
            </div>
          </div>

          {/* Характеристики */}
          {showStats && (
            <div className="mt-3 pt-2 border-t text-sm">
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                <div className="flex justify-between"><span>💪 Сила</span><span>{entity.strength}</span></div>
                <div className="flex justify-between"><span>🏃 Ловкость</span><span>{entity.agility}</span></div>
                <div className="flex justify-between"><span>🧠 Интеллект</span><span>{entity.intelligence}</span></div>
                <div className="flex justify-between"><span>💪 Телосложение</span><span>{entity.physique}</span></div>
                <div className="flex justify-between"><span>🕯️ Мудрость</span><span>{entity.wisdom}</span></div>
                <div className="flex justify-between"><span>🗣️ Харизма</span><span>{entity.charisma}</span></div>
              </div>
            </div>
          )}

          {/* Способности */}
          {showAbilities && (
            <div className="mt-3 pt-2 border-t">
              <div className="text-sm font-semibold mb-2">Активные способности</div>
              {activeAbilities.length === 0 && <div className="text-xs text-gray-500">Нет активных способностей</div>}
              {activeAbilities.map(ability => {
                const remainingCooldown = ability.remaining_cooldown_turns ?? 0;
                const isOnCooldown = remainingCooldown > 0;
                const isPlayer = participant.entity_type === "player";
                return (
                  <div key={ability.id} className="mb-2 p-2 bg-gray-50 rounded text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium">{ability.name}</span>
                        {isOnCooldown && (
                          <span className="ml-2 text-xs text-red-500">(КД: {remainingCooldown})</span>
                        )}
                        {isPlayer && !isOnCooldown && (
                          <span className="ml-2 text-xs text-blue-500">(игрок использует сам)</span>
                        )}
                      </div>
                      {!isPlayer && !isOnCooldown && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUseAbility(ability.id);
                          }}
                          className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Использовать
                        </button>
                      )}
                    </div>
                    {ability.description && <div className="text-xs text-gray-500 mt-1">{ability.description}</div>}
                  </div>
                );
              })}
              <div className="text-sm font-semibold mt-3 mb-2">Пассивные способности</div>
              {passiveAbilities.length === 0 && <div className="text-xs text-gray-500">Нет пассивных способностей</div>}
              {passiveAbilities.map(ability => (
                <div key={ability.id} className="mb-1 text-xs text-gray-600">
                  • {ability.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {isCurrentTurn && (
        <div className="mt-2 text-xs text-blue-600 font-semibold text-center">▶ Текущий ход</div>
      )}
    </div>
  );
};
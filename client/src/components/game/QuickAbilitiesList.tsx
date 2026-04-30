// client/src/components/game/QuickAbilitiesList.tsx
import React, { useState } from "react";
import { Zap, Clock } from "lucide-react";
import type { PlayerAbilityExtended } from "../../types";
import { useNotification } from "../../hooks/useNotification";

interface QuickAbilitiesListProps {
  abilities: PlayerAbilityExtended[];
  playerId: number;
  onUseAbility?: () => Promise<void>;
}

const formatCooldown = (ability: PlayerAbilityExtended): string | null => {
  if (ability.remaining_cooldown_turns && ability.remaining_cooldown_turns > 0) {
    return `${ability.remaining_cooldown_turns} ход${ability.remaining_cooldown_turns === 1 ? "" : ability.remaining_cooldown_turns < 5 ? "а" : "ов"}`;
  }
  if (ability.remaining_cooldown_days && ability.remaining_cooldown_days > 0) {
    return `${ability.remaining_cooldown_days} ${ability.remaining_cooldown_days === 1 ? "день" : "дня"}`;
  }
  return null;
};

export const QuickAbilitiesList: React.FC<QuickAbilitiesListProps> = ({ abilities, playerId, onUseAbility }) => {
  const [loading, setLoading] = useState<number | null>(null);
  const { showError, showSuccess } = useNotification();

  const activeAbilities = abilities.filter(a => a.ability_type === "active" && a.is_active);

  const handleUse = async (abilityId: number) => {
    if (loading !== null) return;
    setLoading(abilityId);
    try {
      const response = await fetch(`/api/abilities/${abilityId}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Ошибка использования способности");
      }
      showSuccess("Способность применена");
      if (onUseAbility) await onUseAbility();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Неизвестная ошибка";
      showError(errorMessage);
    } finally {
      setLoading(null);
    }
  };

  if (activeAbilities.length === 0) {
    return <div className="text-gray-400 text-sm italic">Нет активных способностей</div>;
  }

  return (
    <div className="space-y-3">
      {activeAbilities.map((ability) => {
        const cooldown = formatCooldown(ability);
        const isOnCooldown = cooldown !== null;
        return (
          <div key={ability.id} className="bg-gray-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={18} className="text-amber-400" />
              <span className="text-gray-200 font-medium text-base">{ability.name}</span>
            </div>
            {ability.description && (
              <p className="text-sm text-gray-400 mb-3">{ability.description}</p>
            )}
            <div className="flex items-center justify-between gap-3">
              {cooldown && (
                <div className="flex items-center gap-1 text-sm text-orange-300">
                  <Clock size={16} />
                  <span>{cooldown}</span>
                </div>
              )}
              <button
                onClick={() => handleUse(ability.id)}
                disabled={isOnCooldown || loading === ability.id}
                className={`flex-1 py-3 rounded-lg text-base font-medium transition-colors ${
                  isOnCooldown
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-amber-600 hover:bg-amber-500 text-white active:scale-95"
                }`}
              >
                {loading === ability.id ? "..." : "Использовать"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
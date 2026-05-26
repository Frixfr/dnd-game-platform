// client/src/components/game/ActiveEffectsWidget.tsx
import React from "react";
import { Sparkles, Clock } from "lucide-react";
import type { PlayerEffectExtended } from "../../types";

interface ActiveEffectsWidgetProps {
  effects: PlayerEffectExtended[];
  onEffectClick?: (effect: PlayerEffectExtended) => void;
}

const formatRemaining = (effect: PlayerEffectExtended): string => {
  if (effect.remaining_turns !== undefined && effect.remaining_turns !== null && effect.remaining_turns > 0) {
    return `${effect.remaining_turns} ход${effect.remaining_turns === 1 ? "" : effect.remaining_turns < 5 ? "а" : "ов"}`;
  }
  if (effect.remaining_days !== undefined && effect.remaining_days !== null && effect.remaining_days > 0) {
    return `${effect.remaining_days} ${effect.remaining_days === 1 ? "день" : effect.remaining_days < 5 ? "дня" : "дней"}`;
  }
  return "∞";
};

export const ActiveEffectsWidget: React.FC<ActiveEffectsWidgetProps> = ({ effects, onEffectClick }) => {
  const temporaryEffects = effects.filter(
    (e) =>
      (e.remaining_turns !== null && e.remaining_turns > 0) ||
      (e.remaining_days !== null && e.remaining_days > 0)
  );

  if (temporaryEffects.length === 0) {
    return <div className="text-[#F2E9E4]/60 text-sm italic">Нет активных временных эффектов</div>;
  }

  return (
    <div className="flex overflow-x-auto gap-3 pb-2 -mx-1 px-1 scrollbar-thin">
      {temporaryEffects.map((effect) => (
        <div
          key={effect.id}
          onClick={() => onEffectClick?.(effect)}
          className="flex-shrink-0 w-48 bg-[#0A1F44]/70 rounded-xl p-3 cursor-pointer hover:bg-[#0A1F44] transition-colors border border-[#F2E9E4]/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-[#FF0026]" />
            <span className="text-[#F2E9E4] font-medium text-sm truncate">{effect.name}</span>
          </div>
          {effect.source_name && (
            <div className="text-xs text-[#F2E9E4]/60 truncate mb-1">{effect.source_name}</div>
          )}
          <div className="flex items-center gap-1 text-xs text-[#FF0026]">
            <Clock size={12} />
            <span>{formatRemaining(effect)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
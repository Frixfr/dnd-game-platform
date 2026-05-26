// client/src/components/game/StatWithTooltip.tsx
import React from "react";

interface StatBonus {
  source: string;
  value: number;
}

interface StatWithTooltipProps {
  label: string;
  baseValue: number;
  finalValue: number;
  bonuses?: StatBonus[];
  icon?: React.ReactNode;
}

export const StatWithTooltip: React.FC<StatWithTooltipProps> = ({ label, baseValue, finalValue, bonuses, icon }) => {
  const diff = finalValue - baseValue;
  const hasBonus = diff !== 0;

  const tooltipText = hasBonus && bonuses && bonuses.length > 0
    ? bonuses.map(b => `${b.source}: ${b.value > 0 ? '+' : ''}${b.value}`).join('\n')
    : hasBonus ? `Общий бонус: ${diff > 0 ? '+' : ''}${diff}` : "";

  return (
    <div className="bg-card p-4 rounded-xl border border-border-color relative group">
      <div className="flex items-center gap-2 text-text-secondary mb-2">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl font-bold text-text-primary">{finalValue}</span>
        {hasBonus && (
          <span
            className="text-sm text-text-secondary cursor-help border-b border-dotted border-text-secondary"
            title={tooltipText}
          >
            ({diff > 0 ? '+' : ''}{diff})
          </span>
        )}
      </div>
      {baseValue !== finalValue && (
        <div className="text-xs text-text-secondary mt-1">база: {baseValue}</div>
      )}
    </div>
  );
};
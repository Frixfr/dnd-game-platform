// client/src/components/ui/SelectedEffectsList.tsx
import { X } from 'lucide-react';
import type { EffectType } from '../../types';

interface SelectedEffectsListProps {
  title?: string;
  effects: EffectType[];
  onRemove: (effectId: number) => void;
  emptyText?: string;
}

export const SelectedEffectsList = ({
  title,
  effects,
  onRemove,
  emptyText = 'Нет добавленных эффектов',
}: SelectedEffectsListProps) => {
  if (effects.length === 0) {
    return (
      <div>
        {title && <h3 className="text-sm font-medium text-[#F2E9E4] mb-2">{title}</h3>}
        <div className="text-sm text-[#F2E9E4]/60 border border-dashed border-[#F2E9E4]/20 rounded p-3 text-center">
          {emptyText}
        </div>
      </div>
    );
  }

  const formatDuration = (effect: EffectType): string => {
    if (effect.is_instant) return '⚡ Мгновенный';
    if (effect.is_permanent) return 'Постоянный';
    const parts = [];
    if (effect.duration_turns) parts.push(`${effect.duration_turns} ходов`);
    if (effect.duration_days) parts.push(`${effect.duration_days} дней`);
    return parts.length ? parts.join(' / ') : 'Без длительности';
  };

  return (
    <div>
      {title && <h3 className="text-sm font-medium text-[#F2E9E4] mb-2">{title}</h3>}
      <div className="space-y-2 max-h-48 overflow-y-auto border border-[#F2E9E4]/20 rounded p-2 bg-[#0A1F44]/50">
        {effects.map((effect) => {
          const isInstant = effect.is_instant === true;
          return (
            <div
              key={effect.id}
              className={`flex items-center justify-between bg-[#0A1F44] p-2 rounded shadow-sm border ${
                isInstant ? 'border-amber-400/50 bg-amber-400/5' : 'border-[#F2E9E4]/20'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {isInstant && <span className="text-amber-400 text-sm">⚡</span>}
                  <span className="font-medium text-sm text-[#F2E9E4]">{effect.name}</span>
                </div>
                <div className="text-xs text-[#F2E9E4]/60 flex gap-3 mt-1">
                  {effect.attribute && (
                    <span>
                      {effect.attribute}: {effect.modifier > 0 ? `+${effect.modifier}` : effect.modifier}
                    </span>
                  )}
                  <span>{formatDuration(effect)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(effect.id)}
                className="text-[#FF0026] hover:text-[#FF0026]/80 p-1"
                title="Удалить эффект"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
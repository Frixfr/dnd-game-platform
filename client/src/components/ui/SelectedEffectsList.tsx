// client/src/components/ui/SelectedEffectsList.tsx
import { X } from 'lucide-react';
import type { EffectType } from '../../types';

interface SelectedEffectsListProps {
  title?: string; // теперь опциональный
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

  return (
    <div>
      {title && <h3 className="text-sm font-medium text-[#F2E9E4] mb-2">{title}</h3>}
      <div className="space-y-2 max-h-48 overflow-y-auto border border-[#F2E9E4]/20 rounded p-2 bg-[#0A1F44]/50">
        {effects.map((effect) => (
          <div
            key={effect.id}
            className="flex items-center justify-between bg-[#0A1F44] p-2 rounded shadow-sm border border-[#F2E9E4]/20"
          >
            <div className="flex-1">
              <div className="font-medium text-sm text-[#F2E9E4]">{effect.name}</div>
              <div className="text-xs text-[#F2E9E4]/60 flex gap-3 mt-1">
                {effect.attribute && (
                  <span>
                    {effect.attribute}: {effect.modifier > 0 ? `+${effect.modifier}` : effect.modifier}
                  </span>
                )}
                {effect.duration_turns && (
                  <span>{effect.duration_turns} ходов</span>
                )}
                {effect.duration_days && (
                  <span>{effect.duration_days} дней</span>
                )}
                {effect.is_permanent && <span>постоянный</span>}
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
        ))}
      </div>
    </div>
  );
};
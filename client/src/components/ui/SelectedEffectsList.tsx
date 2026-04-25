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
        {title && <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>}
        <div className="text-sm text-gray-500 border border-dashed rounded p-3 text-center">
          {emptyText}
        </div>
      </div>
    );
  }

  return (
    <div>
      {title && <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>}
      <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-2 bg-gray-50">
        {effects.map((effect) => (
          <div
            key={effect.id}
            className="flex items-center justify-between bg-white p-2 rounded shadow-sm border"
          >
            <div className="flex-1">
              <div className="font-medium text-sm">{effect.name}</div>
              <div className="text-xs text-gray-500 flex gap-3 mt-1">
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
              className="text-red-500 hover:text-red-700 p-1"
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
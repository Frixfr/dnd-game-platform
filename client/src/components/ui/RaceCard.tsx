// client/src/components/ui/RaceCard.tsx
import type { RaceType, EffectType } from '../../types';

interface RaceCardProps {
  race: RaceType;
  onClick: () => void;
  onDelete: () => void;
}

export const RaceCard = ({ race, onClick, onDelete }: RaceCardProps) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete();
  };

  const effects = race.effects || [];

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 hover:border-gray-200"
    >
      <div className="relative h-2 bg-gradient-to-r from-purple-400 to-pink-500" />

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-800 tracking-tight">{race.name}</h3>
          <button
            onClick={handleDelete}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors text-xl font-bold"
            title="Удалить расу"
          >
            ×
          </button>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-3 min-h-[3rem]">
          {race.description || 'Нет описания'}
        </p>

        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">✨</span>
            <span className="text-sm font-medium text-gray-700">Эффекты расы</span>
            {effects.length > 0 && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full ml-auto">
                {effects.length}
              </span>
            )}
          </div>
          
          {effects.length === 0 ? (
            <div className="text-sm text-gray-400 italic">Нет эффектов</div>
          ) : (
            <div className="space-y-1.5">
              {effects.slice(0, 3).map((effect: EffectType) => (
                <div key={effect.id} className="text-sm text-gray-700 flex items-start gap-1">
                  <span className="text-purple-500 shrink-0">•</span>
                  <span>
                    <span className="font-medium">{effect.name}</span>
                    {effect.attribute && (
                      <span className="text-gray-500 text-xs ml-1">
                        ({effect.attribute} {effect.modifier > 0 ? `+${effect.modifier}` : effect.modifier})
                      </span>
                    )}
                  </span>
                </div>
              ))}
              {effects.length > 3 && (
                <div className="text-xs text-gray-400 mt-1">
                  + ещё {effects.length - 3} эффект(ов)
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
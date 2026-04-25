// client/src/components/ui/AbilityCard.tsx
import type { AbilityType, EffectType } from '../../types';

interface AbilityCardProps {
  ability: AbilityType;
  effect?: EffectType;
  onClick?: () => void;
  disabled?: boolean;
  onDelete?: () => void;
  showId?: boolean; // добавлено
}

export const AbilityCard = ({ ability, effect, onClick, disabled = false, onDelete, showId = true }: AbilityCardProps) => {
  const formatCooldown = () => {
    const { cooldown_turns, cooldown_days } = ability;
    const parts = [];
    if (cooldown_turns > 0) parts.push(`${cooldown_turns} ход${cooldown_turns === 1 ? '' : cooldown_turns < 5 ? 'а' : 'ов'}`);
    if (cooldown_days > 0) parts.push(`${cooldown_days} ${cooldown_days === 1 ? 'день' : cooldown_days < 5 ? 'дня' : 'дней'}`);
    return parts.length ? parts.join(' / ') : 'Нет отката';
  };

  const isActive = ability.ability_type === 'active';
  const topBarColor = isActive ? 'from-blue-400 to-indigo-500' : 'from-emerald-400 to-teal-500';

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete();
  };

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 hover:border-gray-200 ${
        disabled ? 'opacity-60 cursor-not-allowed' : ''
      }`}
    >
      <div className={`relative h-2 bg-gradient-to-r ${topBarColor}`} />

      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-bold text-gray-800 tracking-tight">{ability.name}</h3>
          <div className="flex items-center gap-2">
            {showId && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">#{ability.id}</span>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors text-xl font-bold"
                title="Удалить"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {ability.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{ability.description}</p>
        )}

        <div className="space-y-3">
          {isActive && (
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">⏱️</span>
                <span className="text-sm text-gray-600">Откат</span>
              </div>
              <span className="text-sm font-medium text-gray-800">{formatCooldown()}</span>
            </div>
          )}

          {effect && (
            <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-400">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✨</span>
                  <span className="text-sm font-semibold text-gray-700">Эффект:</span>
                  <span className="text-sm font-medium text-gray-900">{effect.name}</span>
                </div>
                <div className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                  effect.modifier > 0 ? 'bg-green-100 text-green-700' :
                  effect.modifier < 0 ? 'bg-red-100 text-red-700' :
                  'bg-gray-200 text-gray-700'
                }`}>
                  {effect.modifier > 0 ? '+' : ''}{effect.modifier}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                {effect.attribute && (
                  <div className="flex items-center gap-1">
                    <span>📊</span>
                    <span className="capitalize">{effect.attribute.replace('_', ' ')}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span>⏳</span>
                  <span>
                    {effect.is_permanent
                      ? 'Постоянный'
                      : `${effect.duration_turns ? `${effect.duration_turns} ходов` : ''} ${effect.duration_days ? `${effect.duration_days} дней` : ''}`.trim() || 'Без длительности'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
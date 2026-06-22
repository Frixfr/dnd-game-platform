// client/src/components/ui/AbilityCard.tsx
import type { AbilityType, EffectType } from '../../types';

interface AbilityCardProps {
  ability: AbilityType;
  effect?: EffectType;
  onClick?: () => void;
  disabled?: boolean;
  onDelete?: () => void;
  showId?: boolean;
}

export const AbilityCard = ({ ability, effect, onClick, disabled = false, onDelete, showId = true }: AbilityCardProps) => {
  const formatCooldown = () => {
    const { cooldown_turns, cooldown_days } = ability;
    const parts = [];
    if (cooldown_turns > 0) parts.push(`${cooldown_turns} ход${cooldown_turns === 1 ? '' : cooldown_turns < 5 ? 'а' : 'ов'}`);
    if (cooldown_days > 0) parts.push(`${cooldown_days} ${cooldown_days === 1 ? 'день' : cooldown_days < 5 ? 'дня' : 'дней'}`);
    return parts.length ? parts.join(' / ') : 'Нет отката';
  };

  const formatEffectDuration = (effect: EffectType): string => {
    if (effect.is_instant) return '⚡ Мгновенный';
    if (effect.is_permanent) return 'Постоянный';
    const parts = [];
    if (effect.duration_turns) parts.push(`${effect.duration_turns} ходов`);
    if (effect.duration_days) parts.push(`${effect.duration_days} дней`);
    return parts.length ? parts.join(' / ') : 'Без длительности';
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
      className={`group bg-card rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-border-color hover:border-accent-red/30 ${
        disabled ? 'opacity-60 cursor-not-allowed' : ''
      }`}
    >
      <div className={`relative h-2 bg-gradient-to-r ${topBarColor}`} />

      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-bold text-text-primary tracking-tight">{ability.name}</h3>
          <div className="flex items-center gap-2">
            {showId && (
              <span className="text-xs text-text-secondary bg-bg-secondary px-2 py-1 rounded-full">#{ability.id}</span>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-accent-red hover:bg-accent-red/10 rounded-full transition-colors text-xl font-bold"
                title="Удалить"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {ability.description && (
          <p className="text-sm text-text-secondary mb-4 line-clamp-2">{ability.description}</p>
        )}

        <div className="space-y-3">
          {isActive && (
            <div className="flex items-center justify-between bg-bg-secondary rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">⏱️</span>
                <span className="text-sm text-text-secondary">Откат</span>
              </div>
              <span className="text-sm font-medium text-text-primary">{formatCooldown()}</span>
            </div>
          )}

          {effect && (
            <div className="bg-bg-secondary rounded-lg p-3 border-l-4 border-blue-400">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✨</span>
                  <span className="text-sm font-semibold text-text-primary">Эффект:</span>
                  <span className="text-sm font-medium text-text-primary">{effect.name}</span>
                  {effect.is_instant && (
                    <span className="text-xs bg-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded-full">⚡</span>
                  )}
                </div>
                <div className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                  effect.is_instant ? 'bg-amber-400/20 text-amber-400' :
                  effect.modifier > 0 ? 'bg-green-500/20 text-green-400' :
                  effect.modifier < 0 ? 'bg-red-500/20 text-red-400' :
                  'bg-bg-tertiary text-text-secondary'
                }`}>
                  {effect.modifier > 0 ? '+' : ''}{effect.modifier}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
                {effect.attribute && (
                  <div className="flex items-center gap-1">
                    <span>📊</span>
                    <span className="capitalize">{effect.attribute.replace('_', ' ')}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span>{effect.is_instant ? '⚡' : '⏳'}</span>
                  <span>{formatEffectDuration(effect)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
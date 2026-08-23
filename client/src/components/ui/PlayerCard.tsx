// client/src/components/ui/PlayerCard.tsx - Обновленный дизайн
import type { PlayerType, StatType } from '../../types';
import { useRaceStore } from '../../stores/raceStore';

interface PlayerCardProps {
  player: PlayerType;
  onClick: () => void;
  disabled?: boolean;
  onDelete?: () => void;
}

const statLabels: Record<StatType, string> = {
  strength: 'СИЛ',
  agility: 'ЛОВ',
  intelligence: 'ИНТ',
  physique: 'ТЕЛ',
  wisdom: 'МДР',
  charisma: 'ХАР',
};

export const PlayerCard = ({ player, onClick, disabled = false, onDelete }: PlayerCardProps) => {
  const finalMaxHealth = player.final_stats?.max_health ?? player.max_health;
  const finalHealth = player.final_stats?.health ?? player.health;
  const healthPercent = (finalHealth / finalMaxHealth) * 100;
  const initials = player.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const { races } = useRaceStore();
  const race = races.find(r => r.id === player.race_id);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete();
  };

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`group bg-card rounded-2xl border border-border-color hover:border-accent-red/30 transition-all duration-300 cursor-pointer overflow-hidden shadow-lg hover:shadow-xl ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-1'
      }`}
    >
      {/* Верхняя цветная полоса */}
      <div className="relative h-1.5 bg-gradient-to-r from-accent-red to-red-600" />

      <div className="p-5">
        {/* Заголовок карточки */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center overflow-hidden border border-border-color">
              {player.avatar_url ? (
                <img src={player.avatar_url} alt={player.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-text-primary font-bold text-lg">{initials}</span>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary tracking-tight">{player.name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-text-muted capitalize">
                  {player.gender === 'male' ? '♂ Муж' : '♀ Жен'}
                </span>
                {race && (
                  <span className="text-xs text-text-primary bg-bg-tertiary px-2 py-0.5 rounded-full border border-border-color">
                    {race.name}
                  </span>
                )}
                {player.in_battle && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-red/20 text-accent-red border border-accent-red/30">
                    <span className="w-1.5 h-1.5 bg-accent-red rounded-full animate-pulse" />
                    В бою
                  </span>
                )}
                {player.is_online && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Онлайн
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-1 rounded-full border border-border-color">#{player.id}</span>
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

        {/* Здоровье */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-text-secondary mb-1.5">
            <span>❤️ Здоровье</span>
            <span className="font-medium text-text-primary">
              {finalHealth}/{finalMaxHealth}{player.final_stats?.max_health !== player.max_health && (
                <span className="text-xs text-text-secondary ml-1">
                  ({player.final_stats!.max_health - player.max_health > 0 ? '+' : ''}{player.final_stats!.max_health - player.max_health})
                </span>
              )}
            </span>
          </div>
          <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden border border-border-color">
            <div
              className="h-full bg-gradient-to-r from-accent-red to-red-600 rounded-full transition-all duration-300"
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>

        {/* Броня */}
        <div className="flex items-center justify-between bg-bg-tertiary rounded-xl p-3 mb-4 border border-border-color">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛡️</span>
            <span className="text-sm text-text-secondary">Класс брони</span>
          </div>
          <span className="text-xl font-bold text-text-primary">
            {player.armor}{player.final_stats?.armor !== player.armor && (
              <span className="text-xs text-text-secondary ml-1">
                ({player.final_stats!.armor - player.armor > 0 ? '+' : ''}{player.final_stats!.armor - player.armor})
              </span>
            )}
          </span>
        </div>

        {/* Характеристики */}
        <div className="grid grid-cols-3 gap-2">
          {(['strength', 'agility', 'intelligence', 'physique', 'wisdom', 'charisma'] as StatType[]).map(stat => {
            const baseValue = player[stat];
            const finalValue = player.final_stats?.[stat] ?? baseValue;
            const diff = finalValue - baseValue;
            const modifierText = diff !== 0 ? (diff > 0 ? `+${diff}` : `${diff}`) : '';
            return (
              <div
                key={stat}
                className="flex items-center justify-between bg-bg-tertiary rounded-lg px-2 py-2 border border-border-color"
                title={statLabels[stat]}
              >
                <span className="text-xs font-mono font-medium text-text-secondary">{statLabels[stat]}</span>
                <span className="font-mono font-semibold text-text-primary">
                  {baseValue}{modifierText && <span className="text-xs text-text-secondary ml-0.5">({modifierText})</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

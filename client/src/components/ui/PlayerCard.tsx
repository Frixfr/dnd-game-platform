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
  const healthPercent = (player.health / player.max_health) * 100;
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
      className={`group bg-[var(--color-bg-card)] rounded-2xl border border-[var(--border-color)] hover:border-amber-500/30 transition-all duration-300 cursor-pointer overflow-hidden shadow-lg hover:shadow-xl hover:shadow-amber-500/10 ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-1'
      }`}
    >
      {/* Верхняя цветная полоса */}
      <div className="relative h-1.5 bg-gradient-to-r from-amber-400 to-amber-600" />

      <div className="p-5">
        {/* Заголовок карточки */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center overflow-hidden border border-amber-500/30">
              {player.avatar_url ? (
                <img src={player.avatar_url} alt={player.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-amber-400 font-bold text-lg">{initials}</span>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">{player.name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-[var(--text-muted)] capitalize">
                  {player.gender === 'male' ? '♂ Муж' : '♀ Жен'}
                </span>
                {race && (
                  <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {race.name}
                  </span>
                )}
                {player.in_battle && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
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
            <span className="text-xs text-[var(--text-muted)] bg-[var(--color-bg-tertiary)] px-2 py-1 rounded-full border border-[var(--border-color)]">#{player.id}</span>
            {onDelete && (
              <button
                onClick={handleDelete}
                className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors text-xl font-bold"
                title="Удалить"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Здоровье */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-[var(--text-secondary)] mb-1.5">
            <span>❤️ Здоровье</span>
            <span className="font-medium text-amber-400">
              {player.health}/{player.max_health}
            </span>
          </div>
          <div className="h-2 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden border border-[var(--border-color)]">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-300"
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>

        {/* Броня */}
        <div className="flex items-center justify-between bg-[var(--color-bg-tertiary)] rounded-xl p-3 mb-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛡️</span>
            <span className="text-sm text-[var(--text-secondary)]">Класс брони</span>
          </div>
          <span className="text-xl font-bold text-amber-400">{player.armor}</span>
        </div>

        {/* Характеристики */}
        <div className="grid grid-cols-3 gap-2">
          {(['strength', 'agility', 'intelligence', 'physique', 'wisdom', 'charisma'] as StatType[]).map(stat => {
            const baseValue = player[stat];
            const finalValue = player.final_stats?.[stat] ?? baseValue;
            const diff = finalValue - baseValue;
            const diffText = diff !== 0 ? (diff > 0 ? `(+${diff})` : `(${diff})`) : '';
            return (
              <div
                key={stat}
                className="flex items-center justify-between bg-[var(--color-bg-tertiary)] rounded-lg px-2 py-2 border border-[var(--border-color)]"
                title={statLabels[stat]}
              >
                <span className="text-xs font-mono font-medium text-[var(--text-secondary)]">{statLabels[stat]}</span>
                <span className="font-mono font-semibold text-[var(--text-primary)]">
                  {baseValue} <span className="text-xs text-amber-400">{diffText}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

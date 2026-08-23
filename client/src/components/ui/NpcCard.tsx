// client/src/components/ui/NpcCard.tsx
import type { NpcType, StatType } from '../../types';
import { useRaceStore } from '../../stores/raceStore';

interface NpcCardProps {
  npc: NpcType;
  onClick: () => void;
  disabled?: boolean;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

const statLabels: Record<StatType, string> = {
  strength: 'СИЛ',
  agility: 'ЛОВ',
  intelligence: 'ИНТ',
  physique: 'ТЕЛ',
  wisdom: 'МДР',
  charisma: 'ХАР',
};

const aggressionConfig: Record<0 | 1 | 2, { label: string; color: string }> = {
  0: { label: 'Мирный', color: 'bg-green-500/20 text-green-400' },
  1: { label: 'Нейтральный', color: 'bg-yellow-500/20 text-yellow-400' },
  2: { label: 'Агрессивный', color: 'bg-red-500/20 text-red-400' },
};

export const NpcCard = ({ npc, onClick, disabled = false, onDelete, onDuplicate }: NpcCardProps) => {
  const healthPercent = (npc.health / npc.max_health) * 100;
  const initials = npc.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const { races } = useRaceStore();
  const race = races.find(r => r.id === npc.race_id);
  const aggression = aggressionConfig[npc.aggression];

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
      <div className="relative h-2 bg-gradient-to-r from-purple-400 to-pink-500" />

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-bg-secondary to-bg-tertiary flex items-center justify-center overflow-hidden shadow-inner border border-border-color">
              {npc.avatar_url ? (
                <img src={npc.avatar_url} alt={npc.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-text-primary font-bold text-lg">{initials}</span>
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-text-primary tracking-tight">{npc.name}</h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-text-secondary capitalize">
                  {npc.gender === 'male' ? '♂ Муж' : '♀ Жен'}
                </span>
                {race && (
                  <span className="text-xs text-text-secondary bg-bg-secondary px-2 py-0.5 rounded-full">
                    {race.name}
                  </span>
                )}
                {npc.in_battle && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    В бою
                  </span>
                )}
                {npc.is_online && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Онлайн
                  </span>
                )}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${aggression.color}`}>
                  {aggression.label}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary bg-bg-secondary px-2 py-1 rounded-full">#{npc.id}</span>
            {onDuplicate && (
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-blue-400 hover:bg-blue-500/10 rounded-full transition-colors"
                title="Дублировать"
              >
                ⎘
              </button>
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

        {/* Здоровье */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-text-secondary mb-1">
            <span>❤️ Здоровье</span>
            <span className="font-medium text-text-primary">
              {npc.health}/{npc.max_health}{npc.final_stats && npc.final_stats.max_health !== npc.max_health && (
                <span className="text-xs text-text-secondary ml-1">
                  ({npc.final_stats.max_health - npc.max_health > 0 ? '+' : ''}{npc.final_stats.max_health - npc.max_health})
                </span>
              )}
            </span>
          </div>
          <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-300"
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>

        {/* Броня */}
        <div className="flex items-center justify-between bg-bg-secondary rounded-xl p-2 mb-4 border border-border-color">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛡️</span>
            <span className="text-sm text-text-secondary">Класс брони</span>
          </div>
          <span className="text-xl font-bold text-text-primary">
            {npc.armor}{npc.final_stats && npc.final_stats.armor !== npc.armor && (
              <span className="text-xs text-text-secondary ml-1">
                ({npc.final_stats.armor - npc.armor > 0 ? '+' : ''}{npc.final_stats.armor - npc.armor})
              </span>
            )}
          </span>
        </div>

        {/* Характеристики */}
        <div className="grid grid-cols-3 gap-2">
          {(['strength', 'agility', 'intelligence', 'physique', 'wisdom', 'charisma'] as StatType[]).map(stat => {
            const baseValue = npc[stat];
            const finalValue = npc.final_stats?.[stat] ?? baseValue;
            const diff = finalValue - baseValue;
            const modifierText = diff !== 0 ? (diff > 0 ? `+${diff}` : `${diff}`) : '';
            return (
              <div
                key={stat}
                className="flex items-center justify-between bg-bg-secondary rounded-lg px-2 py-1.5 border border-border-color"
                title={statLabels[stat]}
              >
                <span className="text-sm font-mono font-medium text-text-secondary">{statLabels[stat]}</span>
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
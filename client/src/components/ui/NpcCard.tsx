// client/src/components/ui/NpcCard.tsx
import type { NpcType, StatType } from '../../types';
import { useRaceStore } from '../../stores/raceStore'; // <-- добавить

interface NpcCardProps {
  npc: NpcType;
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

const aggressionConfig: Record<0 | 1 | 2, { label: string; color: string }> = {
  0: { label: 'Мирный', color: 'bg-green-100 text-green-800' },
  1: { label: 'Нейтральный', color: 'bg-yellow-100 text-yellow-800' },
  2: { label: 'Агрессивный', color: 'bg-red-100 text-red-800' },
};

export const NpcCard = ({ npc, onClick, disabled = false, onDelete }: NpcCardProps) => {
  const healthPercent = (npc.health / npc.max_health) * 100;
  const initials = npc.name
    .split(' ')
    .map(n => n[0])
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
      className={`group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 hover:border-gray-200 ${
        disabled ? 'opacity-60 cursor-not-allowed' : ''
      }`}
    >
      <div className="relative h-2 bg-gradient-to-r from-purple-400 to-pink-500" />

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden shadow-inner">
              {npc.avatar_url ? (
                <img src={npc.avatar_url} alt={npc.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-700 font-bold text-lg">{initials}</span>
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 tracking-tight">{npc.name}</h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-gray-500 capitalize">
                  {npc.gender === 'male' ? '♂ Муж' : '♀ Жен'}
                </span>
                {race && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {race.name}
                  </span>
                )}
                {npc.in_battle && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    В бою
                  </span>
                )}
                {npc.is_online && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
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
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">#{npc.id}</span>
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

        {/* Здоровье */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>❤️ Здоровье</span>
            <span className="font-medium">
              {npc.health}/{npc.max_health}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-300"
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>

        {/* Броня */}
        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-2 mb-4 border border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛡️</span>
            <span className="text-sm text-gray-600">Класс брони</span>
          </div>
          <span className="text-xl font-bold text-gray-800">{npc.armor}</span>
        </div>

        {/* Характеристики */}
        <div className="grid grid-cols-3 gap-2">
          {(['strength', 'agility', 'intelligence', 'physique', 'wisdom', 'charisma'] as StatType[]).map(stat => {
            const value = npc[stat];
            return (
              <div
                key={stat}
                className="flex items-center justify-between bg-gray-50 rounded-lg px-2 py-1.5"
                title={statLabels[stat]}
              >
                <span className="text-sm font-mono font-medium text-gray-700">{statLabels[stat]}</span>
                <span className="font-mono font-semibold text-gray-800">{value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
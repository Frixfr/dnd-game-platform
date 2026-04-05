// client/src/components/ui/PlayerCard.tsx
import type { PlayerType, StatType } from '../../types';

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

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && confirm(`Удалить игрока "${player.name}"?`)) {
      onDelete();
    }
  };

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 hover:border-gray-200 ${
        disabled ? 'opacity-60 cursor-not-allowed' : ''
      }`}
    >
      <div className="relative h-2 bg-gradient-to-r from-blue-400 to-indigo-500" />

      <div className="p-5">
        {/* Шапка с именем и правым блоком (крестик + ID) */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-700 font-bold text-lg shadow-inner">
              {initials}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 tracking-tight">{player.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500 capitalize">{player.gender === 'male' ? '♂ Муж' : '♀ Жен'}</span>
                {player.in_battle && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    В бою
                  </span>
                )}
                {player.is_online && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Онлайн
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Блок крестик + ID */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">#{player.id}</span>
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
              {player.health}/{player.max_health}
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
          <span className="text-xl font-bold text-gray-800">{player.armor}</span>
        </div>

        {/* Характеристики */}
        <div className="grid grid-cols-3 gap-2">
          {(['strength', 'agility', 'intelligence', 'physique', 'wisdom', 'charisma'] as StatType[]).map(stat => {
            const value = player[stat];
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
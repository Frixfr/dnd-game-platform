// client/src/components/ui/PlayerCard.tsx
import type { PlayerType, StatType } from '../../types';

interface PlayerCardProps {
  player: PlayerType;
  onClick?: () => void;
}

// Минималистичная карточка с возможностью клика
export const PlayerCard = ({ player, onClick }: PlayerCardProps) => {
  return (
    <div 
      onClick={onClick}
      className="group bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 cursor-pointer transition-all duration-300 border border-gray-200 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-200/50 hover:scale-[1.02]"
    >
      {/* Заголовок карточки */}
      <div className="mb-6 text-center">
        <h3 className="text-2xl font-semibold text-gray-900 tracking-tight">
          {player.name}
        </h3>
      </div>

      {/* Статусная панель */}
      <div className="mb-6">
        {/* Здоровье */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Здоровье</span>
            <span className="font-medium text-gray-800">
              {player.health}/{player.max_health}
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-500"
              style={{ width: `${(player.health / player.max_health) * 100}%` }}
            />
          </div>
        </div>

        {/* Броня */}
        <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-lg border border-blue-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-lg">
              <span className="text-blue-600">🛡️</span>
            </div>
            <div>
              <div className="text-xs text-gray-600">Класс брони</div>
              <div className="text-lg font-bold text-gray-900">{player.armor} AC</div>
            </div>
          </div>
        </div>
      </div>

      {/* Характеристики */}
      <div className="grid grid-cols-3 gap-2">
        {(['strength', 'agility', 'intelligence', 'physique', 'wisdom', 'charisma'] as StatType[]).map(stat => {
          const statLabels: Record<StatType, string> = {
            strength: 'СИЛ',
            agility: 'ЛОВ',
            intelligence: 'ИНТ',
            physique: 'ТЕЛ',
            wisdom: 'МДР',
            charisma: 'ХАР'
          };

          const colorClasses: Record<StatType, string> = {
            strength: 'border-red-200 bg-red-50 text-red-700',
            agility: 'border-green-200 bg-green-50 text-green-700',
            intelligence: 'border-blue-200 bg-blue-50 text-blue-700',
            physique: 'border-amber-200 bg-amber-50 text-amber-700',
            wisdom: 'border-purple-200 bg-purple-50 text-purple-700',
            charisma: 'border-pink-200 bg-pink-50 text-pink-700',
          };

          const value = player[stat];

          return (
            <div
              key={stat}
              className={`rounded-lg p-3 border ${colorClasses[stat]} transition-all duration-200 hover:scale-[1.03] hover:shadow-sm`}
            >
              <div className="text-xs text-gray-600 mb-1 opacity-80">
                {statLabels[stat as StatType]}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
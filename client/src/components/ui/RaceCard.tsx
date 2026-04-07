// client/src/components/ui/RaceCard.tsx
import type { RaceType } from '../../types';

interface RaceCardProps {
  race: RaceType;
  onClick: () => void;
  onDelete: () => void;
}

export const RaceCard = ({ race, onClick, onDelete }: RaceCardProps) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Удалить расу "${race.name}"?`)) {
      onDelete();
    }
  };

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 hover:border-gray-200"
    >
      <div className="relative h-2 bg-gradient-to-r from-purple-400 to-pink-500" />

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-xl font-bold text-gray-800 tracking-tight">{race.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-400">ID: {race.id}</span>
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors text-xl font-bold"
            title="Удалить"
          >
            ×
          </button>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-3 min-h-[3rem]">
          {race.description || 'Нет описания'}
        </p>

        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <span className="text-sm text-gray-600">Эффектов</span>
          </div>
          <span className="text-xl font-bold text-gray-800">{race.effects?.length || 0}</span>
        </div>

        <button
          onClick={onClick}
          className="mt-4 w-full py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-xl transition text-gray-700"
        >
          Редактировать
        </button>
      </div>
    </div>
  );
};
// client/src/components/ui/ItemCard.tsx
import type { ItemType } from '../../types';

interface ItemCardProps {
  item: ItemType & { quantity?: number };
  onClick?: () => void;
  onDelete?: () => void;
  showId?: boolean; // добавлено
}

const rarityConfig: Record<ItemType['rarity'], { label: string; gradient: string; badgeClass: string }> = {
  common: { label: 'Обычный', gradient: 'from-gray-300 to-gray-400', badgeClass: 'bg-gray-100 text-gray-800' },
  uncommon: { label: 'Необычный', gradient: 'from-green-400 to-green-500', badgeClass: 'bg-green-100 text-green-800' },
  rare: { label: 'Редкий', gradient: 'from-blue-400 to-blue-500', badgeClass: 'bg-blue-100 text-blue-800' },
  epic: { label: 'Эпический', gradient: 'from-purple-400 to-purple-500', badgeClass: 'bg-purple-100 text-purple-800' },
  legendary: { label: 'Легендарный', gradient: 'from-yellow-400 to-yellow-500', badgeClass: 'bg-yellow-100 text-yellow-800' },
  mythical: { label: 'Мифический', gradient: 'from-red-400 to-red-500', badgeClass: 'bg-red-100 text-red-800' },
  story: { label: 'Сюжетный', gradient: 'from-orange-400 to-orange-500', badgeClass: 'bg-orange-100 text-orange-800' },
};

export const ItemCard = ({ item, onClick, onDelete, showId = true }: ItemCardProps) => {
  const config = rarityConfig[item.rarity];

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete();
  };

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 hover:border-gray-200"
    >
      <div className={`relative h-2 bg-gradient-to-r ${config.gradient}`} />

      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-bold text-gray-800 tracking-tight">{item.name}</h3>
          <div className="flex items-center gap-2">
            {item.quantity !== undefined && item.quantity > 0 && (
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                ×{item.quantity}
              </span>
            )}
            {showId && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">#{item.id}</span>
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

        {item.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
        )}

        {(item.active_effects && item.active_effects.length > 0) && (
          <div className="text-sm mb-1">
            <span className="font-semibold text-blue-600">Активные:</span> {item.active_effects.map(e => e.name).join(", ")}
          </div>
        )}
        {(item.passive_effects && item.passive_effects.length > 0) && (
          <div className="text-sm">
            <span className="font-semibold text-green-600">Пассивные:</span> {item.passive_effects.map(e => e.name).join(", ")}
          </div>
        )}
      </div>
    </div>
  );
};
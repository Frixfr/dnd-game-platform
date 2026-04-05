// client/src/components/ui/ItemCard.tsx
import type { ItemType, EffectType } from '../../types';

interface ItemCardProps {
  item: ItemType;
  effects?: EffectType[];
  onClick?: () => void;
  onDelete?: () => void;
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

export const ItemCard = ({ item, effects = [], onClick, onDelete }: ItemCardProps) => {
  const config = rarityConfig[item.rarity];
  const activeEffect = effects.find(e => e.id === item.active_effect_id);
  const passiveEffect = effects.find(e => e.id === item.passive_effect_id);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && confirm(`Удалить предмет "${item.name}"?`)) {
      onDelete();
    }
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
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">#{item.id}</span>
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

        {(activeEffect || passiveEffect) && (
          <div className="space-y-2">
            {activeEffect && (
              <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🎯</span>
                  <span className="text-xs font-medium text-blue-700">Активный</span>
                  <span className="text-sm text-gray-800 truncate max-w-[150px]">{activeEffect.name}</span>
                </div>
                <span className={`text-sm font-bold ${activeEffect.modifier > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {activeEffect.modifier > 0 ? '+' : ''}{activeEffect.modifier}
                </span>
              </div>
            )}
            {passiveEffect && (
              <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2 border border-green-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm">✨</span>
                  <span className="text-xs font-medium text-green-700">Пассивный</span>
                  <span className="text-sm text-gray-800 truncate max-w-[150px]">{passiveEffect.name}</span>
                </div>
                <span className={`text-sm font-bold ${passiveEffect.modifier > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {passiveEffect.modifier > 0 ? '+' : ''}{passiveEffect.modifier}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
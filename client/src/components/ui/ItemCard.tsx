// client/src/components/ui/ItemCard.tsx
import type { ItemType } from '../../types';

interface ItemCardProps {
  item: ItemType & { quantity?: number };
  onClick?: () => void;
  onDelete?: () => void;
  showId?: boolean;
}

const rarityConfig: Record<ItemType['rarity'], { label: string; gradient: string; badgeClass: string }> = {
  common: { label: 'Обычный', gradient: 'from-gray-300 to-gray-400', badgeClass: 'bg-bg-secondary text-text-primary' },
  uncommon: { label: 'Необычный', gradient: 'from-green-400 to-green-500', badgeClass: 'bg-green-500/20 text-green-400' },
  rare: { label: 'Редкий', gradient: 'from-blue-400 to-blue-500', badgeClass: 'bg-blue-500/20 text-blue-400' },
  epic: { label: 'Эпический', gradient: 'from-purple-400 to-purple-500', badgeClass: 'bg-purple-500/20 text-purple-400' },
  legendary: { label: 'Легендарный', gradient: 'from-yellow-400 to-yellow-500', badgeClass: 'bg-yellow-500/20 text-yellow-400' },
  mythical: { label: 'Мифический', gradient: 'from-red-400 to-red-500', badgeClass: 'bg-red-500/20 text-red-400' },
  story: { label: 'Сюжетный', gradient: 'from-orange-400 to-orange-500', badgeClass: 'bg-orange-500/20 text-orange-400' },
};

export const ItemCard = ({ item, onClick, onDelete, showId = true }: ItemCardProps) => {
  const config = rarityConfig[item.rarity];
  const activeEffects = item.active_effects ?? (item.effects?.filter(e => e.effect_type === 'active') ?? []);
  const passiveEffects = item.passive_effects ?? (item.effects?.filter(e => e.effect_type === 'passive') ?? []);
  const activeCount = activeEffects.length;
  const passiveCount = passiveEffects.length;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete();
  };

  return (
    <div
      onClick={onClick}
      className="group bg-card rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-border-color hover:border-accent-red/30"
    >
      <div className={`relative h-2 bg-gradient-to-r ${config.gradient}`} />

      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-bold text-text-primary tracking-tight">{item.name}</h3>
          <div className="flex items-center gap-2">
            {item.quantity !== undefined && item.quantity > 0 && (
              <span className="text-xs bg-bg-secondary text-text-secondary px-2 py-1 rounded-full">
                ×{item.quantity}
              </span>
            )}
            {showId && (
              <span className="text-xs text-text-secondary bg-bg-secondary px-2 py-1 rounded-full">#{item.id}</span>
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

        {item.description && (
          <p className="text-sm text-text-secondary mb-4 line-clamp-2">{item.description}</p>
        )}

        {activeCount > 0 && (
          <div className="text-sm mb-1 flex items-center gap-1">
            <span className="font-semibold text-blue-400">Активные эффекты:</span>
            <span className="text-text-secondary">{activeCount}</span>
          </div>
        )}
        {passiveCount > 0 && (
          <div className="text-sm flex items-center gap-1">
            <span className="font-semibold text-green-400">Пассивные эффекты:</span>
            <span className="text-text-secondary">{passiveCount}</span>
          </div>
        )}
        {activeCount === 0 && passiveCount === 0 && (
          <span className="text-xs text-text-secondary">Без эффектов</span>
        )}
      </div>
    </div>
  );
};
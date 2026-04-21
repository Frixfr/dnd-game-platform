// client/src/components/ui/EffectCard.tsx
import type { EffectType } from '../../types';

interface EffectCardProps {
  effect: EffectType;
  onClick?: () => void;
  showDescription?: boolean;
  compact?: boolean;
  onDelete?: () => void;
}

const attributeLabels: Record<string, string> = {
  health: 'Здоровье',
  max_health: 'Макс. здоровье',
  armor: 'Броня',
  strength: 'Сила',
  agility: 'Ловкость',
  intelligence: 'Интеллект',
  physique: 'Телосложение',
  wisdom: 'Мудрость',
  charisma: 'Харизма',
};

// Функция для нормализации tags (строка -> массив)
const normalizeTags = (tags: string | string[] | null | undefined): string[] => {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const EffectCard = ({ effect, onClick, showDescription = true, compact = false, onDelete }: EffectCardProps) => {
  const tags = normalizeTags(effect.tags);

  const formatDuration = () => {
    if (effect.is_permanent) return 'Постоянный';
    const parts = [];
    if (effect.duration_turns) parts.push(`${effect.duration_turns} ход${effect.duration_turns === 1 ? '' : effect.duration_turns < 5 ? 'а' : 'ов'}`);
    if (effect.duration_days) parts.push(`${effect.duration_days} ${effect.duration_days === 1 ? 'день' : effect.duration_days < 5 ? 'дня' : 'дней'}`);
    return parts.length ? parts.join(' / ') : 'Без длительности';
  };

  let topBarGradient = 'from-gray-400 to-gray-500';
  let modifierColor = 'text-gray-700';
  if (effect.modifier > 0) {
    topBarGradient = 'from-green-400 to-emerald-500';
    modifierColor = 'text-green-600';
  } else if (effect.modifier < 0) {
    topBarGradient = 'from-red-400 to-rose-500';
    modifierColor = 'text-red-600';
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete();
  };

  if (compact) {
    return (
      <div
        onClick={onClick}
        className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden border border-gray-100"
      >
        <div className={`h-1 bg-gradient-to-r ${topBarGradient}`} />
        <div className="p-3 flex justify-between items-center">
          <div>
            <h4 className="font-medium text-gray-900">{effect.name}</h4>
            {effect.attribute && <div className="text-xs text-gray-500">{attributeLabels[effect.attribute] || effect.attribute}</div>}
          </div>
          <div className="flex items-center gap-2">
            {onDelete && (
              <button onClick={handleDelete} className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500">×</button>
            )}
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">#{effect.id}</span>
            <span className={`text-lg font-bold ${modifierColor}`}>{effect.modifier > 0 ? '+' : ''}{effect.modifier}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 hover:border-gray-200"
    >
      <div className={`relative h-2 bg-gradient-to-r ${topBarGradient}`} />

      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-bold text-gray-800 tracking-tight">{effect.name}</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">#{effect.id}</span>
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

        <div className="flex items-center justify-between mb-3">
          {effect.attribute && (
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-sm text-gray-700">
              <span>📊</span> {attributeLabels[effect.attribute] || effect.attribute}
            </div>
          )}
          <div className={`text-lg font-bold ${modifierColor}`}>
            {effect.modifier > 0 ? '+' : ''}{effect.modifier}
          </div>
        </div>

        {showDescription && effect.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{effect.description}</p>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map(tag => (
              <span key={tag} className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{effect.is_permanent ? '∞' : '⏳'}</span>
            <span className="text-sm text-gray-600">{effect.is_permanent ? 'Постоянный' : 'Длительность'}</span>
          </div>
          <span className="text-sm font-medium text-gray-800">{formatDuration()}</span>
        </div>
      </div>
    </div>
  );
};
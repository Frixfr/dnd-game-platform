// client/src/components/ui/EffectCard.tsx
import type { EffectType } from '../../types';

// Расширенный тип для активных эффектов (есть remaining_turns/days)
type EffectWithRemaining = EffectType & {
  remaining_turns?: number | null;
  remaining_days?: number | null;
};

interface EffectCardProps {
  effect: EffectWithRemaining;
  onClick?: () => void;
  showDescription?: boolean;
  compact?: boolean;
  onDelete?: () => void;
  sourceName?: string | null;
  sourceType?: string | null;
  showId?: boolean;
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

export const EffectCard = ({ effect, onClick, showDescription = true, compact = false, onDelete, sourceName, sourceType, showId = true }: EffectCardProps) => {
  const tags = normalizeTags(effect.tags);

  const formatDuration = () => {
    if (effect.is_permanent) return 'Постоянный';
    
    if (effect.remaining_turns !== undefined && effect.remaining_turns !== null && effect.remaining_turns > 0) {
      return `${effect.remaining_turns} ход${effect.remaining_turns === 1 ? '' : effect.remaining_turns < 5 ? 'а' : 'ов'}`;
    }
    if (effect.remaining_days !== undefined && effect.remaining_days !== null && effect.remaining_days > 0) {
      return `${effect.remaining_days} ${effect.remaining_days === 1 ? 'день' : effect.remaining_days < 5 ? 'дня' : 'дней'}`;
    }
    
    // Если остатков нет (0 или null), но эффект не постоянный – считаем истёкшим (не должны сюда попадать)
    if (!effect.is_permanent) return 'Истёк';
    
    const parts = [];
    if (effect.duration_turns) parts.push(`${effect.duration_turns} ход${effect.duration_turns === 1 ? '' : effect.duration_turns < 5 ? 'а' : 'ов'}`);
    if (effect.duration_days) parts.push(`${effect.duration_days} ${effect.duration_days === 1 ? 'день' : effect.duration_days < 5 ? 'дня' : 'дней'}`);
    return parts.length ? parts.join(' / ') : 'Без длительности';
  };

  let topBarGradient = 'from-gray-400 to-gray-500';
  let modifierColor = 'text-text-primary';
  if (effect.modifier > 0) {
    topBarGradient = 'from-green-400 to-emerald-500';
    modifierColor = 'text-green-400';
  } else if (effect.modifier < 0) {
    topBarGradient = 'from-red-400 to-rose-500';
    modifierColor = 'text-red-400';
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete();
  };

  if (compact) {
    return (
      <div
        onClick={onClick}
        className="group bg-card rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden border border-border-color"
      >
        <div className={`h-1 bg-gradient-to-r ${topBarGradient}`} />
        <div className="p-3 flex justify-between items-center">
          <div>
            <h4 className="font-medium text-text-primary">{effect.name}</h4>
            {effect.attribute && <div className="text-xs text-text-secondary">{attributeLabels[effect.attribute] || effect.attribute}</div>}
          </div>
          <div className="flex items-center gap-2">
            {onDelete && (
              <button onClick={handleDelete} className="w-5 h-5 flex items-center justify-center text-text-secondary hover:text-accent-red">×</button>
            )}
            {showId && (
              <span className="text-xs text-text-secondary bg-bg-secondary px-1.5 py-0.5 rounded-full">#{effect.id}</span>
            )}
            <span className={`text-lg font-bold ${modifierColor}`}>{effect.modifier > 0 ? '+' : ''}{effect.modifier}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="group bg-card rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-border-color hover:border-accent-red/30"
    >
      <div className={`relative h-2 bg-gradient-to-r ${topBarGradient}`} />

      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-bold text-text-primary tracking-tight">{effect.name}</h3>
          <div className="flex items-center gap-2">
            {showId && (
              <span className="text-xs text-text-secondary bg-bg-secondary px-2 py-1 rounded-full">#{effect.id}</span>
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

        <div className="flex items-center justify-between mb-3">
          {effect.attribute && (
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-bg-secondary rounded-lg text-sm text-text-primary">
              <span>📊</span> {attributeLabels[effect.attribute] || effect.attribute}
            </div>
          )}
          <div className={`text-lg font-bold ${modifierColor}`}>
            {effect.modifier > 0 ? '+' : ''}{effect.modifier}
          </div>
        </div>

        {showDescription && effect.description && (
          <p className="text-sm text-text-secondary mb-4 line-clamp-2">{effect.description}</p>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map(tag => (
              <span key={tag} className="inline-block px-2 py-0.5 text-xs bg-bg-secondary text-text-secondary rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between bg-bg-secondary rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{effect.is_permanent ? '∞' : '⏳'}</span>
            <span className="text-sm text-text-secondary">{effect.is_permanent ? 'Постоянный' : 'Осталось'}</span>
          </div>
          <span className="text-sm font-medium text-text-primary">{formatDuration()}</span>
        </div>

        {sourceName && (
          <div className="text-xs text-text-secondary flex items-center gap-1 mt-3 pt-2 border-t border-border-color">
            {sourceType === 'race' && '🌿'}
            {sourceType === 'ability' && '✨'}
            {sourceType === 'item' && '📦'}
            {sourceType === 'admin' && '👑'}
            <span>От {sourceName}</span>
          </div>
        )}        
      </div>
    </div>
  );
};
// client/src/components/ui/EffectCard.tsx
import type { EffectType } from '../../types';

interface EffectCardProps {
  effect: EffectType;
  onClick?: () => void;
  showDescription?: boolean;
  compact?: boolean;
}

// Карточка эффекта с визуальным отображением параметров
export const EffectCard = ({ effect, onClick, showDescription = true, compact = false }: EffectCardProps) => {
  // Форматирование длительности
  const formatDuration = () => {
    const { duration_turns, duration_days, is_permanent } = effect;
    
    if (is_permanent) {
      return 'Постоянный';
    }
    
    const parts = [];
    
    if (duration_turns && duration_turns > 0) {
      parts.push(`${duration_turns} ход${getPluralForm(duration_turns, ['', 'а', 'ов'])}`);
    }
    
    if (duration_days && duration_days > 0) {
      parts.push(`${duration_days} ${getPluralForm(duration_days, ['день', 'дня', 'дней'])}`);
    }
    
    return parts.length > 0 ? parts.join(' / ') : 'Без длительности';
  };

  // Функция для определения правильной формы слова
  const getPluralForm = (number: number, forms: [string, string, string]) => {
    if (number % 10 === 1 && number % 100 !== 11) return forms[0];
    if (number % 10 >= 2 && number % 10 <= 4 && (number % 100 < 10 || number % 100 >= 20)) return forms[1];
    return forms[2];
  };

  // Определяем цветовую схему в зависимости от типа эффекта
  const getEffectColors = () => {
    const { modifier, is_permanent } = effect;
    
    if (modifier > 0) {
      return is_permanent 
        ? {
            bgFrom: 'from-green-50',
            bgTo: 'to-emerald-100/30',
            border: 'border-green-200',
            hoverBorder: 'hover:border-green-300',
            hoverShadow: 'hover:shadow-green-200/30',
            modifierBg: 'bg-green-100',
            modifierText: 'text-green-800',
            durationBg: 'bg-emerald-50',
            durationText: 'text-emerald-700',
            icon: '⬆️'
          }
        : {
            bgFrom: 'from-blue-50',
            bgTo: 'to-blue-100/30',
            border: 'border-blue-200',
            hoverBorder: 'hover:border-blue-300',
            hoverShadow: 'hover:shadow-blue-200/30',
            modifierBg: 'bg-blue-100',
            modifierText: 'text-blue-800',
            durationBg: 'bg-cyan-50',
            durationText: 'text-cyan-700',
            icon: '⏫'
          };
    } else if (modifier < 0) {
      return is_permanent
        ? {
            bgFrom: 'from-red-50',
            bgTo: 'to-rose-100/30',
            border: 'border-red-200',
            hoverBorder: 'hover:border-red-300',
            hoverShadow: 'hover:shadow-red-200/30',
            modifierBg: 'bg-red-100',
            modifierText: 'text-red-800',
            durationBg: 'bg-rose-50',
            durationText: 'text-rose-700',
            icon: '⬇️'
          }
        : {
            bgFrom: 'from-orange-50',
            bgTo: 'to-amber-100/30',
            border: 'border-orange-200',
            hoverBorder: 'hover:border-orange-300',
            hoverShadow: 'hover:shadow-orange-200/30',
            modifierBg: 'bg-orange-100',
            modifierText: 'text-orange-800',
            durationBg: 'bg-amber-50',
            durationText: 'text-amber-700',
            icon: '⏬'
          };
    } else {
      return is_permanent
        ? {
            bgFrom: 'from-gray-50',
            bgTo: 'to-slate-100/30',
            border: 'border-gray-200',
            hoverBorder: 'hover:border-gray-300',
            hoverShadow: 'hover:shadow-gray-200/30',
            modifierBg: 'bg-gray-100',
            modifierText: 'text-gray-800',
            durationBg: 'bg-slate-50',
            durationText: 'text-slate-700',
            icon: '⚪'
          }
        : {
            bgFrom: 'from-purple-50',
            bgTo: 'to-violet-100/30',
            border: 'border-purple-200',
            hoverBorder: 'hover:border-purple-300',
            hoverShadow: 'hover:shadow-purple-200/30',
            modifierBg: 'bg-purple-100',
            modifierText: 'text-purple-800',
            durationBg: 'bg-violet-50',
            durationText: 'text-violet-700',
            icon: '⚫'
          };
    }
  };

  // Русские названия атрибутов
  const attributeLabels: Record<string, string> = {
    health: 'Здоровье',
    max_health: 'Макс. здоровье',
    armor: 'Броня',
    strength: 'Сила',
    agility: 'Ловкость',
    intelligence: 'Интеллект',
    physique: 'Телосложение',
    wisdom: 'Мудрость',
    charisma: 'Харизма'
  };

  const colors = getEffectColors();
  const durationText = formatDuration();

  // Компактная версия
  if (compact) {
    return (
      <div 
        onClick={onClick}
        className={`group relative bg-gradient-to-br ${colors.bgFrom} ${colors.bgTo} rounded-xl p-4 border ${colors.border} ${onClick ? `cursor-pointer ${colors.hoverBorder} hover:shadow-md ${colors.hoverShadow}` : ''} transition-all duration-200`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 flex items-center justify-center ${colors.modifierBg} rounded-lg`}>
              <span className="text-lg">{colors.icon}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-gray-900 truncate">{effect.name}</h3>
              {effect.attribute && (
                <div className="text-xs text-gray-600 capitalize">
                  {attributeLabels[effect.attribute] || effect.attribute}
                </div>
              )}
            </div>
          </div>
          <div className={`text-lg font-bold ${colors.modifierText}`}>
            {effect.modifier > 0 ? '+' : ''}{effect.modifier}
          </div>
        </div>
      </div>
    );
  }

  // Полная версия
  return (
    <div 
      onClick={onClick}
      className={`group relative bg-gradient-to-br ${colors.bgFrom} ${colors.bgTo} rounded-2xl p-6 border ${colors.border} ${onClick ? `cursor-pointer ${colors.hoverBorder} hover:shadow-lg ${colors.hoverShadow} hover:scale-[1.02]` : ''} transition-all duration-300`}
    >
      {/* Бейдж типа эффекта */}
      <div className="absolute top-4 right-4">
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${colors.modifierBg} ${colors.modifierText}`}>
          {effect.is_permanent ? 'Постоянный' : 'Временный'}
        </span>
      </div>

      {/* Заголовок и модификатор */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-xl font-semibold text-gray-900 pr-10 flex-1">
            {effect.name}
          </h3>
          <div className={`w-16 h-16 flex items-center justify-center ${colors.modifierBg} rounded-xl`}>
            <div className="text-center">
              <div className="text-2xl font-bold">{colors.icon}</div>
              <div className={`text-lg font-bold ${colors.modifierText}`}>
                {effect.modifier > 0 ? '+' : ''}{effect.modifier}
              </div>
            </div>
          </div>
        </div>
        
        {effect.attribute && (
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-white/70 backdrop-blur-sm rounded-lg border border-white/50">
            <span className="text-sm text-gray-600">Атрибут:</span>
            <span className="text-sm font-medium text-gray-800 capitalize">
              {attributeLabels[effect.attribute] || effect.attribute.replace('_', ' ')}
            </span>
          </div>
        )}
      </div>

      {/* Описание эффекта */}
      {showDescription && effect.description && (
        <div className="mb-6">
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
            {effect.description}
          </p>
        </div>
      )}

      {/* Панель характеристик */}
      <div className="space-y-4">
        {/* Длительность эффекта */}
        <div className={`p-4 rounded-xl border ${colors.border} ${colors.durationBg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-white/80 rounded-lg">
                {effect.is_permanent ? (
                  <span className="text-lg text-gray-600">∞</span>
                ) : (
                  <span className="text-lg text-gray-600">⏳</span>
                )}
              </div>
              <div>
                <div className="text-xs text-gray-600">
                  {effect.is_permanent ? 'Тип эффекта' : 'Длительность'}
                </div>
                <div className={`text-sm font-medium ${colors.durationText}`}>
                  {durationText}
                </div>
              </div>
            </div>
            
            {/* Визуализация длительности */}
            {!effect.is_permanent && (
              <div className="flex items-center gap-2">
                {effect.duration_turns && (
                  <div className="text-center">
                    <div className={`text-xs font-bold ${colors.durationText}`}>
                      {effect.duration_turns}
                    </div>
                    <div className="text-xs text-gray-500">ходов</div>
                  </div>
                )}
                {effect.duration_days && (
                  <>
                    {effect.duration_turns && <div className="text-gray-300">|</div>}
                    <div className="text-center">
                      <div className={`text-xs font-bold ${colors.durationText}`}>
                        {effect.duration_days}
                      </div>
                      <div className="text-xs text-gray-500">дней</div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Детали эффекта */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-white/50 rounded-lg border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Модификатор</div>
            <div className={`text-lg font-bold ${colors.modifierText}`}>
              {effect.modifier > 0 ? '+' : ''}{effect.modifier}
            </div>
          </div>
        </div>
      </div>

      {/* Индикатор кликабельности */}
      {onClick && (
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-full shadow-sm">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

// Вспомогательный компонент для списка эффектов
export const EffectList = ({ effects, onEffectClick }: { 
  effects: EffectType[]; 
  onEffectClick?: (effect: EffectType) => void;
}) => {
  // Группируем эффекты по типу (положительные/отрицательные/нейтральные)
  const positiveEffects = effects.filter(e => e.modifier > 0);
  const negativeEffects = effects.filter(e => e.modifier < 0);
  const neutralEffects = effects.filter(e => e.modifier === 0);

  return (
    <div className="space-y-6">
      {/* Положительные эффекты */}
      {positiveEffects.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-green-500">⬆</span> Положительные эффекты ({positiveEffects.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {positiveEffects.map(effect => (
              <EffectCard
                key={effect.id}
                effect={effect}
                onClick={() => onEffectClick?.(effect)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Отрицательные эффекты */}
      {negativeEffects.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-red-500">⬇</span> Отрицательные эффекты ({negativeEffects.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {negativeEffects.map(effect => (
              <EffectCard
                key={effect.id}
                effect={effect}
                onClick={() => onEffectClick?.(effect)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Нейтральные эффекты */}
      {neutralEffects.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-gray-500">⚪</span> Нейтральные эффекты ({neutralEffects.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {neutralEffects.map(effect => (
              <EffectCard
                key={effect.id}
                effect={effect}
                onClick={() => onEffectClick?.(effect)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Компактный вид для таблицы или списка
export const EffectRow = ({ effect, onClick }: { effect: EffectType; onClick?: () => void }) => {
  const colors = {
    positive: 'bg-green-100 text-green-800',
    negative: 'bg-red-100 text-red-800',
    neutral: 'bg-gray-100 text-gray-800'
  };

  const modifierColor = effect.modifier > 0 ? colors.positive : 
                       effect.modifier < 0 ? colors.negative : colors.neutral;

  return (
    <tr 
      onClick={onClick}
      className={`border-b border-gray-100 hover:bg-gray-50 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <td className="py-3 px-4">
        <div className="font-medium text-gray-900">{effect.name}</div>
        {effect.description && (
          <div className="text-sm text-gray-600 truncate max-w-xs">{effect.description}</div>
        )}
      </td>
      <td className="py-3 px-4">
        {effect.attribute ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {effect.attribute}
          </span>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        )}
      </td>
      <td className="py-3 px-4">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${modifierColor}`}>
          {effect.modifier > 0 ? '+' : ''}{effect.modifier}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {effect.is_permanent ? (
            <span className="text-gray-600">Постоянный</span>
          ) : (
            <>
              {effect.duration_turns && (
                <span className="text-sm bg-amber-50 text-amber-700 px-2 py-1 rounded">
                  {effect.duration_turns} ход.
                </span>
              )}
              {effect.duration_days && (
                <span className="text-sm bg-violet-50 text-violet-700 px-2 py-1 rounded">
                  {effect.duration_days} дн.
                </span>
              )}
            </>
          )}
        </div>
      </td>
      <td className="py-3 px-4 text-right">
        {onClick && (
          <button className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </td>
    </tr>
  );
};
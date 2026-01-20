// client/src/components/ui/ItemCard.tsx
import type { ItemType, EffectType } from '../../types';
import { useState } from 'react';

interface ItemCardProps {
  item: ItemType;
  effects?: EffectType[]; // Передаем эффекты для отображения деталей
  onClick?: () => void;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ItemCard = ({ 
  item, 
  effects = [], 
  onClick, 
  showActions = false,
  onEdit,
  onDelete 
}: ItemCardProps) => {
  const [showEffectDetails, setShowEffectDetails] = useState(false);
  
  // Цвета для редкости
  const rarityConfig = {
    common: { 
      color: 'from-gray-300 to-gray-100', 
      text: 'text-gray-700',
      badge: 'bg-gray-100 text-gray-800',
      label: 'Обычный'
    },
    uncommon: { 
      color: 'from-green-400 to-green-100', 
      text: 'text-green-700',
      badge: 'bg-green-100 text-green-800',
      label: 'Необычный'
    },
    rare: { 
      color: 'from-blue-400 to-blue-100', 
      text: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-800',
      label: 'Редкий'
    },
    epic: { 
      color: 'from-purple-500 to-purple-200', 
      text: 'text-purple-700',
      badge: 'bg-purple-100 text-purple-800',
      label: 'Эпический'
    },
    legendary: { 
      color: 'from-yellow-500 to-yellow-200', 
      text: 'text-yellow-700',
      badge: 'bg-yellow-100 text-yellow-800',
      label: 'Легендарный'
    },
    mythical: { 
      color: 'from-red-500 to-red-200', 
      text: 'text-red-700',
      badge: 'bg-red-100 text-red-800',
      label: 'Мифический'
    },
    story: { 
      color: 'from-orange-500 to-orange-200', 
      text: 'text-orange-700',
      badge: 'bg-orange-100 text-orange-800',
      label: 'Сюжетный'
    }
  };

  const config = rarityConfig[item.rarity];
  
  // Получаем эффекты по ID
  const activeEffect = effects.find(e => e.id === item.active_effect_id);
  const passiveEffect = effects.find(e => e.id === item.passive_effect_id);
  
  // Иконки для типов эффектов
  const getEffectIcon = (effect: EffectType) => {
    if (!effect.attribute) return '🎯';
    
    const icons: Record<string, string> = {
      health: '❤️',
      max_health: '💓',
      armor: '🛡️',
      strength: '💪',
      agility: '⚡',
      intelligence: '🧠',
      physique: '🏋️',
      wisdom: '🔮',
      charisma: '✨'
    };
    
    return icons[effect.attribute] || '🎯';
  };
  
  const formatModifier = (modifier: number) => {
    return modifier > 0 ? `+${modifier}` : modifier;
  };

  return (
    <div 
      onClick={onClick}
      className={`
        group relative bg-gradient-to-br ${config.color} 
        rounded-2xl p-6 border-2 ${config.text.split(' ')[0]}/20
        transition-all duration-300 hover:shadow-xl hover:shadow-${config.text.split(' ')[0]}/20
        hover:scale-[1.02] hover:border-${config.text.split(' ')[0]}/30
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
        overflow-hidden
      `}
    >
      {/* Декоративный уголок */}
      <div className={`absolute top-0 right-0 w-16 h-16 ${config.text} opacity-10`}>
        <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-current"></div>
      </div>
      
      {/* Заголовок карточки */}
      <div className="mb-6 relative z-10">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-2xl font-bold text-gray-900 tracking-tight pr-2">
            {item.name}
          </h3>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.badge} whitespace-nowrap`}>
            {config.label}
          </span>
        </div>
        
        {/* Описание */}
        {item.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {item.description}
          </p>
        )}
      </div>

      {/* Основная информация */}
      <div className="mb-6 space-y-4">
        {/* Количество */}
        <div className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-white/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm">
              <span className="text-xl">📦</span>
            </div>
            <div>
              <div className="text-xs text-gray-500">Базовое количество</div>
              <div className="text-xl font-bold text-gray-900">
                {item.base_quantity} шт.
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            В инвентаре
          </div>
        </div>
        
        {/* Эффекты */}
        {(activeEffect || passiveEffect) && (
          <div className="bg-white/50 rounded-xl border border-white/70 p-4">
            <div 
              className="flex justify-between items-center mb-2 cursor-pointer"
              onClick={() => setShowEffectDetails(!showEffectDetails)}
            >
              <h4 className="text-sm font-semibold text-gray-700">Эффекты</h4>
              <span className="text-xs text-gray-500">
                {showEffectDetails ? 'Скрыть' : 'Показать'}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Активный эффект */}
              {activeEffect && (
                <div className={`rounded-lg p-3 transition-all duration-200 ${showEffectDetails ? 'bg-blue-50/70 border border-blue-100' : 'bg-white/70'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🎯</span>
                    <div className="text-xs font-medium text-blue-700">Активный</div>
                  </div>
                  
                  {showEffectDetails ? (
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-gray-800">
                        {activeEffect.name}
                      </div>
                      <div className="text-xs text-gray-600 line-clamp-2">
                        {activeEffect.description || 'Без описания'}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {activeEffect.attribute && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                            {activeEffect.attribute}
                          </span>
                        )}
                        <span className={`text-sm font-bold ${activeEffect.modifier > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatModifier(activeEffect.modifier)}
                        </span>
                        {!activeEffect.is_permanent && (
                          <span className="text-xs text-gray-500">
                            {activeEffect.duration_turns 
                              ? `${activeEffect.duration_turns} ходов`
                              : activeEffect.duration_days 
                                ? `${activeEffect.duration_days} дней`
                                : ''
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-gray-700 truncate">
                      {activeEffect.name}
                    </div>
                  )}
                </div>
              )}
              
              {/* Пассивный эффект */}
              {passiveEffect && (
                <div className={`rounded-lg p-3 transition-all duration-200 ${showEffectDetails ? 'bg-green-50/70 border border-green-100' : 'bg-white/70'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">✨</span>
                    <div className="text-xs font-medium text-green-700">Пассивный</div>
                  </div>
                  
                  {showEffectDetails ? (
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-gray-800">
                        {passiveEffect.name}
                      </div>
                      <div className="text-xs text-gray-600 line-clamp-2">
                        {passiveEffect.description || 'Без описания'}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {passiveEffect.attribute && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded">
                            {passiveEffect.attribute}
                          </span>
                        )}
                        <span className={`text-sm font-bold ${passiveEffect.modifier > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatModifier(passiveEffect.modifier)}
                        </span>
                        {passiveEffect.is_permanent && (
                          <span className="text-xs text-gray-500">Постоянный</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-gray-700 truncate">
                      {passiveEffect.name}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Индикаторы, если эффекты не загружены */}
            {(!activeEffect && item.active_effect_id) && (
              <div className="text-xs text-gray-500 mt-2">
                Активный эффект: ID {item.active_effect_id}
              </div>
            )}
            {(!passiveEffect && item.passive_effect_id) && (
              <div className="text-xs text-gray-500 mt-2">
                Пассивный эффект: ID {item.passive_effect_id}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Кнопки действий */}
      {showActions && (onEdit || onDelete) && (
        <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-2 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-md transition-shadow"
              title="Редактировать"
            >
              <span className="text-gray-600">✏️</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-md transition-shadow"
              title="Удалить"
            >
              <span className="text-red-500">🗑️</span>
            </button>
          )}
        </div>
      )}

      {/* Индикатор отсутствия эффектов */}
      {!activeEffect && !passiveEffect && (
        <div className="text-center py-3 text-sm text-gray-500 italic">
          Эффекты не назначены
        </div>
      )}
    </div>
  );
};
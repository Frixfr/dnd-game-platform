// client/src/components/ui/AbilityCard.tsx (обновленный)
import type { AbilityType, EffectType } from '../../types';

interface AbilityCardProps {
  ability: AbilityType;
  effect?: EffectType;
  onClick?: () => void;
  disabled?: boolean;
}

// Минималистичная карточка способности с возможностью клика
export const AbilityCard = ({ ability, effect, onClick }: AbilityCardProps) => {
  // Форматирование времени отката
  const formatCooldown = () => {
    const { cooldown_turns, cooldown_days } = ability;
    const parts = [];
    
    if (cooldown_turns > 0) {
      parts.push(`${cooldown_turns} ход${cooldown_turns === 1 ? '' : cooldown_turns > 4 ? 'ов' : 'а'}`);
    }
    
    if (cooldown_days > 0) {
      parts.push(`${cooldown_days} ${cooldown_days === 1 ? 'день' : cooldown_days > 4 ? 'дней' : 'дня'}`);
    }
    
    return parts.length > 0 ? parts.join(' / ') : 'Нет отката';
  };

  // Определяем цветовую схему в зависимости от типа способности
  const getTypeColors = () => {
    if (ability.ability_type === 'active') {
      return {
        bgFrom: 'from-blue-50',
        bgTo: 'to-blue-100/30',
        border: 'border-blue-200',
        hoverBorder: 'hover:border-blue-300',
        hoverShadow: 'hover:shadow-blue-200/30',
        typeBadge: 'bg-blue-100 text-blue-800',
        typeIcon: '⚡',
        cooldownBg: 'bg-blue-50/80',
        cooldownText: 'text-blue-700'
      };
    } else {
      return {
        bgFrom: 'from-emerald-50',
        bgTo: 'to-emerald-100/30',
        border: 'border-emerald-200',
        hoverBorder: 'hover:border-emerald-300',
        hoverShadow: 'hover:shadow-emerald-200/30',
        typeBadge: 'bg-emerald-100 text-emerald-800',
        typeIcon: '🛡️',
        cooldownBg: 'bg-emerald-50/80',
        cooldownText: 'text-emerald-700'
      };
    }
  };

  // Определяем цвет для модификатора эффекта
  const getModifierColor = (modifier: number) => {
    if (modifier > 0) return 'text-green-600';
    if (modifier < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const colors = getTypeColors();
  const cooldownText = formatCooldown();

  return (
    <div 
      onClick={onClick}
      className={`group bg-gradient-to-br ${colors.bgFrom} ${colors.bgTo} rounded-2xl p-6 cursor-pointer transition-all duration-300 border ${colors.border} ${colors.hoverBorder} hover:shadow-lg ${colors.hoverShadow} hover:scale-[1.02] active:scale-[0.99]`}
    >
      {/* Заголовок карточки */}
      <div className="mb-4 flex justify-between items-start">
        <h3 className="text-xl font-semibold text-gray-900 tracking-tight pr-2">
          {ability.name}
        </h3>
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${colors.typeBadge}`}>
          {ability.ability_type === 'active' ? 'Активная' : 'Пассивная'}
        </span>
      </div>

      {/* Описание способности */}
      {ability.description && (
        <div className="mb-6">
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
            {ability.description}
          </p>
        </div>
      )}

      {/* Панель характеристик */}
      <div className="space-y-4">
        {/* Время отката */}
        {ability.ability_type === 'active' && (
          <div className={`p-3 rounded-lg border ${colors.border} ${colors.cooldownBg}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center bg-white/80 rounded-lg">
                  <span className={`text-lg ${colors.cooldownText}`}>⏱️</span>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Откат способности</div>
                  <div className={`text-sm font-medium ${colors.cooldownText}`}>
                    {cooldownText}
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {colors.typeIcon}
              </div>
            </div>
          </div>
        )}

        {/* Эффект способности */}
        {effect && (
          <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center bg-purple-100 rounded-lg">
                  <span className="text-purple-600">✨</span>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Применяемый эффект</div>
                  <div className="text-sm font-medium text-gray-900">
                    {effect.name}
                  </div>
                </div>
              </div>
              <div className={`text-sm font-bold ${getModifierColor(effect.modifier)}`}>
                {effect.modifier > 0 ? '+' : ''}{effect.modifier}
              </div>
            </div>
            
            {/* Детали эффекта */}
            <div className="pl-11">
              {effect.attribute && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-500">Атрибут:</span>
                  <span className="text-xs font-medium text-gray-800 capitalize">
                    {effect.attribute.replace('_', ' ')}
                  </span>
                </div>
              )}
              
              {/* Длительность эффекта */}
              <div className="flex items-center gap-4 text-xs">
                {effect.is_permanent ? (
                  <span className="text-gray-600">Постоянный эффект</span>
                ) : (
                  <>
                    {effect.duration_turns && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Ходы:</span>
                        <span className="font-medium text-gray-800">
                          {effect.duration_turns}
                        </span>
                      </div>
                    )}
                    {effect.duration_days && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Дни:</span>
                        <span className="font-medium text-gray-800">
                          {effect.duration_days}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ID способности внизу */}
      <div className="mt-4 pt-3 border-t border-gray-200/50">
        <div className="text-xs text-gray-500 flex justify-between items-center">
          <span>ID: {ability.id}</span>
          <span className="text-gray-400 group-hover:text-blue-500 transition-colors">
            Нажмите для редактирования →
          </span>
        </div>
      </div>
    </div>
  );
};
// client/src/components/ui/EditAbilityModal.tsx
import { useState, useEffect } from 'react';
import type { AbilityType, EffectType } from '../../types';

interface EditAbilityModalProps {
  ability: AbilityType | null;
  onClose: () => void;
  onAbilityUpdated: (updatedAbility: AbilityType) => void;
  onAbilityCreated?: (newAbility: AbilityType) => void;
  mode: 'edit' | 'create';
}

export const EditAbilityModal = ({ 
  ability, 
  onClose, 
  onAbilityUpdated,
  onAbilityCreated,
  mode = 'edit' 
}: EditAbilityModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ability_type: 'active' as 'active' | 'passive',
    cooldown_turns: 0,
    cooldown_days: 0,
    effect_id: null as number | null
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allEffects, setAllEffects] = useState<EffectType[]>([]);
  const [effectsLoading, setEffectsLoading] = useState(false);
  
  // Загрузка всех эффектов для выпадающего списка
  useEffect(() => {
    const loadEffects = async () => {
      setEffectsLoading(true);
      try {
        const response = await fetch('http://localhost:5000/api/effects');
        if (!response.ok) throw new Error('Ошибка загрузки эффектов');
        const data = await response.json();
        setAllEffects(data || []);
      } catch (err) {
        console.error('Ошибка загрузки эффектов:', err);
      } finally {
        setEffectsLoading(false);
      }
    };
    
    loadEffects();
  }, []);
  
  // Инициализация формы при открытии модального окна
  useEffect(() => {
    if (mode === 'edit' && ability) {
      setFormData({
        name: ability.name || '',
        description: ability.description || '',
        ability_type: ability.ability_type || 'active',
        cooldown_turns: ability.cooldown_turns || 0,
        cooldown_days: ability.cooldown_days || 0,
        effect_id: ability.effect_id || null
      });
    } else if (mode === 'create') {
      setFormData({
        name: '',
        description: '',
        ability_type: 'active',
        cooldown_turns: 0,
        cooldown_days: 0,
        effect_id: null
      });
    }
  }, [ability, mode]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setFormData({
        ...formData,
        [name]: value === '' ? 0 : parseInt(value, 10) || 0
      });
    } else if (name === 'effect_id') {
      setFormData({
        ...formData,
        effect_id: value === '' ? null : parseInt(value, 10)
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Валидация
    if (!formData.name.trim()) {
      setError('Название способности обязательно');
      setLoading(false);
      return;
    }
    
    if (formData.name.length > 100) {
      setError('Название не должно превышать 100 символов');
      setLoading(false);
      return;
    }
    
    if (formData.ability_type !== 'active' && formData.ability_type !== 'passive') {
      setError('Тип способности должен быть "active" или "passive"');
      setLoading(false);
      return;
    }
    
    if (formData.cooldown_turns < 0 || formData.cooldown_days < 0) {
      setError('Значения перезарядки не могут быть отрицательными');
      setLoading(false);
      return;
    }
    
    try {
      let url = 'http://localhost:5000/api/abilities';
      let method = 'POST';
      
      if (mode === 'edit' && ability) {
        url = `http://localhost:5000/api/abilities/${ability.id}`;
        method = 'PUT';
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка сохранения способности');
      }
      
      const result = await response.json();
      
      if (mode === 'edit' && ability) {
        onAbilityUpdated(result.ability);
      } else if (mode === 'create' && onAbilityCreated) {
        onAbilityCreated(result.ability);
      }
      
      onClose();
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при сохранении способности');
      console.error('Ошибка сохранения:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (mode !== 'edit' || !ability) return;
    
    if (!confirm('Вы уверены, что хотите удалить эту способность? Это действие нельзя отменить.')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:5000/api/abilities/${ability.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка удаления способности');
      }
      
      onClose();
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при удалении способности');
      console.error('Ошибка удаления:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const modalTitle = mode === 'edit' 
    ? `Редактирование способности ${ability?.name || ''}` 
    : 'Создание новой способности';
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{modalTitle}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
              disabled={loading}
            >
              &times;
            </button>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Название */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название способности *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                maxLength={100}
                disabled={loading}
                placeholder="Введите название способности"
              />
            </div>
            
            {/* Описание */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                placeholder="Введите описание способности"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Тип способности */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Тип способности *
                </label>
                <select
                  name="ability_type"
                  value={formData.ability_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="active">Активная</option>
                  <option value="passive">Пассивная</option>
                </select>
              </div>
              
              {/* Эффект */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Связанный эффект
                </label>
                <select
                  name="effect_id"
                  value={formData.effect_id || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading || effectsLoading}
                >
                  <option value="">Без эффекта</option>
                  {effectsLoading ? (
                    <option disabled>Загрузка эффектов...</option>
                  ) : (
                    allEffects
                    .filter(effect => 
                      formData.ability_type === 'passive' 
                        ? effect.is_permanent 
                        : !effect.is_permanent
                    )
                    .map(effect => (
                      <option key={effect.id} value={effect.id}>
                        {effect.name} (ID: {effect.id})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Перезарядка в ходах */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Перезарядка (ходов)
                </label>
                <input
                  type="number"
                  name="cooldown_turns"
                  value={formData.cooldown_turns}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">0 = нет перезарядки</p>
              </div>
              
              {/* Перезарядка в днях */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Перезарядка (дней)
                </label>
                <input
                  type="number"
                  name="cooldown_days"
                  value={formData.cooldown_days}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">0 = нет перезарядки</p>
              </div>
            </div>
            
            {/* Информация о связанном эффекте */}
            {formData.effect_id && allEffects.length > 0 && (
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">Информация о эффекте:</h4>
                {(() => {
                  const effect = allEffects.find(e => e.id === formData.effect_id);
                  if (!effect) return <p className="text-sm text-gray-600">Эффект не найден</p>;
                  
                  return (
                    <div className="text-sm">
                      <p><span className="font-medium">Название:</span> {effect.name}</p>
                      <p><span className="font-medium">Описание:</span> {effect.description}</p>
                      <p><span className="font-medium">Атрибут:</span> {effect.attribute}</p>
                      <p><span className="font-medium">Модификатор:</span> {effect.modifier > 0 ? '+' : ''}{effect.modifier}</p>
                      {effect.duration_turns && (
                        <p><span className="font-medium">Длительность:</span> {effect.duration_turns} ход(ов)</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
            
            {/* Кнопки действий */}
            <div className="flex justify-between pt-6 border-t">
              <div>
                {mode === 'edit' && ability && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    {loading ? 'Удаление...' : 'Удалить'}
                  </button>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  disabled={loading}
                >
                  Отмена
                </button>
                
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading 
                    ? (mode === 'edit' ? 'Сохранение...' : 'Создание...') 
                    : (mode === 'edit' ? 'Сохранить изменения' : 'Создать способность')
                  }
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
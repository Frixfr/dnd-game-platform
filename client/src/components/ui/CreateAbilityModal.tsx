// client/src/components/ui/CreateAbilityModal.tsx
import { useState, useEffect } from 'react';
import type { AbilityType, EffectType } from '../../types';
import { useAbilityStore } from '../../stores/abilityStore';

export const CreateAbilityModal = ({ onClose }: { onClose: () => void }) => {
  const [formData, setFormData] = useState<Omit<AbilityType, 'id' | 'created_at' | 'updated_at'>>({
    name: '',
    description: '',
    ability_type: 'active',
    cooldown_turns: 0,
    cooldown_days: 0,
    effect_id: null
  });
  
  const [effects, setEffects] = useState<EffectType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { fetchAbilities } = useAbilityStore();
  
  // Загружаем список эффектов для выпадающего списка
  useEffect(() => {
    const loadEffects = async () => {
        try {
        console.log('Загрузка эффектов...');
        const response = await fetch('http://localhost:5000/api/effects');
        const data = await response.json();
        console.log('Получены эффекты:', data);
        setEffects(data);

        } catch (error) {
        console.error('Ошибка загрузки эффектов:', error);
        }
    };

    loadEffects();
    }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    // Базовая валидация
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
    
    if (formData.cooldown_turns < 0 || formData.cooldown_days < 0) {
      setError('Время отката не может быть отрицательным');
      setLoading(false);
      return;
    }
    
    // Для активных способностей проверяем время отката
    if (formData.ability_type === 'active' && formData.cooldown_turns === 0 && formData.cooldown_days === 0) {
      setError('Активные способности должны иметь время отката');
      setLoading(false);
      return;
    }
    
    // Подготавливаем данные для отправки
    const submitData = {
      ...formData,
      description: formData.description || '',
      effect_id: formData.effect_id || null
    };
    
    try {
      const response = await fetch('http://localhost:5000/api/abilities', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(submitData)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Ошибка сервера');
      }
      
      setSuccess('Способность успешно создана!');         
      
      onClose();
      await fetchAbilities();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEffectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData({
      ...formData,
      effect_id: value ? parseInt(value) : null
    });
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Создать способность</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 rounded text-sm">
              {success}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Основные поля */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название способности *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Введите название способности"
                  maxLength={100}
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.name.length}/100 символов
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Тип способности *
                </label>
                <div className="flex space-x-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="ability_type"
                      value="active"
                      checked={formData.ability_type === 'active'}
                      onChange={(e) => setFormData({...formData, ability_type: e.target.value as 'active' | 'passive'})}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-700">Активная</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="ability_type"
                      value="passive"
                      checked={formData.ability_type === 'passive'}
                      onChange={(e) => setFormData({...formData, ability_type: e.target.value as 'active' | 'passive'})}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-700">Пассивная</span>
                  </label>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formData.ability_type === 'active' 
                    ? 'Требует активации игроком' 
                    : 'Работает постоянно'}
                </div>
              </div>
            </div>
            
            {/* Описание */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32 resize-none"
                placeholder="Опишите способность, ее эффекты и особенности..."
                maxLength={500}
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.description.length}/500 символов
              </div>
            </div>
            
            {/* Время отката */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Время отката (ходы)
                </label>
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={formData.cooldown_turns}
                  onChange={(e) => setFormData({
                    ...formData, 
                    cooldown_turns: Math.max(0, parseInt(e.target.value) || 0)
                  })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Количество ходов до повторного использования
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Время отката (дни)
                </label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={formData.cooldown_days}
                  onChange={(e) => setFormData({
                    ...formData, 
                    cooldown_days: Math.max(0, parseInt(e.target.value) || 0)
                  })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Количество дней до повторного использования
                </div>
              </div>
            </div>
            
            {/* Выбор эффекта */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Связанный эффект
              </label>
              <select
                value={formData.effect_id || ''}
                onChange={handleEffectChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">— Без эффекта —</option>
                {effects
                .filter(effect => 
                  formData.ability_type === 'passive' 
                    ? effect.is_permanent 
                    : !effect.is_permanent
                )
                .map((effect) => (
                  <option key={effect.id} value={effect.id}>
                    {effect.name} ({effect.attribute || 'специальный'}: {effect.modifier > 0 ? '+' : ''}{effect.modifier})
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-500 mt-1">
                Выберите эффект, который применяет эта способность (необязательно)
              </div>
            </div>
            
            {/* Кнопки действий */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                disabled={loading}
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Создание...
                  </span>
                ) : 'Создать способность'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
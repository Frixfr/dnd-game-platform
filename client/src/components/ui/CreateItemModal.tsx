// client/src/components/ui/CreateItemModal.tsx
import { useState, useEffect } from 'react';
import type { ItemType, EffectType } from '../../types';

interface CreateItemModalProps {
  onClose: () => void;
  effects?: EffectType[];
}

// Форма создания предмета с валидацией
export const CreateItemModal = ({ onClose, effects = [] }: CreateItemModalProps) => {
  const [formData, setFormData] = useState<Omit<ItemType, 'id' | 'created_at' | 'updated_at'>>({
    name: '',
    description: '',
    rarity: 'common',
    base_quantity: 1,
    active_effect_id: null,
    passive_effect_id: null
  });
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Загрузка эффектов при монтировании
  useEffect(() => {
    if (effects.length === 0) {
      fetchEffects();
    }
  }, []);
  
  const fetchEffects = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/effects');
      if (!response.ok) throw new Error('Ошибка загрузки эффектов');
      const data = await response.json();
      // Здесь нужно обновить список эффектов в родительском компоненте или хранилище
    } catch (error) {
      console.error('Ошибка загрузки эффектов:', error);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Базовая валидация
    if (!formData.name.trim()) {
      setError('Название обязательно');
      setIsLoading(false);
      return;
    }
    
    if (formData.name.length > 100) {
      setError('Название не должно превышать 100 символов');
      setIsLoading(false);
      return;
    }
    
    if (formData.base_quantity < 1) {
      setError('Количество должно быть положительным числом');
      setIsLoading(false);
      return;
    }
    
    try {
      // Подготавливаем данные для отправки
      const dataToSend = {
        ...formData,
        // Преобразуем пустые строки в null для числовых полей
        active_effect_id: formData.active_effect_id || null,
        passive_effect_id: formData.passive_effect_id || null,
        description: formData.description || ''
      };
      
      const response = await fetch('http://localhost:5000/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Ошибка сервера');
      }
      
      // Сервер сам обновит состояние через сокеты
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleNumberChange = (field: keyof typeof formData, value: string) => {
    const numValue = value === '' ? '' : Number(value);
    handleInputChange(field, numValue);
  };
  
  const rarityOptions = [
    { value: 'common', label: 'Обычный', color: 'bg-gray-100' },
    { value: 'uncommon', label: 'Необычный', color: 'bg-green-100' },
    { value: 'rare', label: 'Редкий', color: 'bg-blue-100' },
    { value: 'epic', label: 'Эпический', color: 'bg-purple-100' },
    { value: 'legendary', label: 'Легендарный', color: 'bg-yellow-100' },
    { value: 'mythical', label: 'Мифический', color: 'bg-red-100' },
    { value: 'story', label: 'Сюжетный', color: 'bg-orange-100' }
  ];
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Создать предмет</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              &times;
            </button>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Основные поля */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Название <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Введите название предмета"
                  maxLength={100}
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.name.length}/100 символов
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Описание</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Описание предмета и его особенностей"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Редкость <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {rarityOptions.map((rarity) => (
                    <label
                      key={rarity.value}
                      className={`
                        flex flex-col items-center justify-center p-2 border rounded cursor-pointer
                        transition-all duration-200
                        ${formData.rarity === rarity.value 
                          ? 'ring-2 ring-blue-500 border-blue-500' 
                          : 'border-gray-300 hover:border-gray-400'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="rarity"
                        value={rarity.value}
                        checked={formData.rarity === rarity.value}
                        onChange={(e) => handleInputChange('rarity', e.target.value)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded-full ${rarity.color} mb-1`}></div>
                      <span className="text-xs text-center">{rarity.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Базовое количество <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={formData.base_quantity}
                    onChange={(e) => handleNumberChange('base_quantity', e.target.value)}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <div className="absolute right-3 top-2 text-gray-500">
                    шт.
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Активный эффект (ID)</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="0"
                    value={formData.active_effect_id || ''}
                    onChange={(e) => handleNumberChange('active_effect_id', e.target.value)}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ID эффекта или оставьте пустым"
                  />
                  {formData.active_effect_id && (
                    <button
                      type="button"
                      onClick={() => handleInputChange('active_effect_id', null)}
                      className="px-3 bg-gray-100 hover:bg-gray-200 rounded border"
                    >
                      ×
                    </button>
                  )}
                </div>
                {formData.active_effect_id && (
                  <div className="text-xs text-gray-500 mt-1">
                    Будет применен при использовании предмета
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Пассивный эффект (ID)</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="0"
                    value={formData.passive_effect_id || ''}
                    onChange={(e) => handleNumberChange('passive_effect_id', e.target.value)}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ID эффекта или оставьте пустым"
                  />
                  {formData.passive_effect_id && (
                    <button
                      type="button"
                      onClick={() => handleInputChange('passive_effect_id', null)}
                      className="px-3 bg-gray-100 hover:bg-gray-200 rounded border"
                    >
                      ×
                    </button>
                  )}
                </div>
                {formData.passive_effect_id && (
                  <div className="text-xs text-gray-500 mt-1">
                    Действует при наличии предмета в инвентаре
                  </div>
                )}
              </div>
            </div>
            
            {/* Информация о выбранных эффектах */}
            {(formData.active_effect_id || formData.passive_effect_id) && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Информация о выбранных эффектах:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {formData.active_effect_id && (
                    <div className="border-l-4 border-blue-500 pl-3">
                      <div className="text-sm font-medium text-blue-700">Активный эффект</div>
                      <div className="text-xs text-gray-600">
                        ID: {formData.active_effect_id}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Загружается информация об эффекте...
                      </div>
                    </div>
                  )}
                  {formData.passive_effect_id && (
                    <div className="border-l-4 border-green-500 pl-3">
                      <div className="text-sm font-medium text-green-700">Пассивный эффект</div>
                      <div className="text-xs text-gray-600">
                        ID: {formData.passive_effect_id}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Загружается информация об эффекте...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Подсказка */}
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <strong>Совет:</strong> Для поиска подходящих эффектов используйте раздел "Эффекты".<br />
              Активный эффект применяется при использовании предмета, пассивный — постоянно действует.
            </div>
            
            {/* Кнопки */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isLoading}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Создание...
                  </span>
                ) : (
                  'Создать предмет'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
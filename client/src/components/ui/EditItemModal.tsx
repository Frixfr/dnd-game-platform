// client/src/components/ui/EditItemModal.tsx
import { useState, useEffect } from 'react';
import type { ItemType, EffectType } from '../../types';

interface EditItemModalProps {
  item: ItemType | null;
  onClose: () => void;
  onItemUpdated: (updatedItem: ItemType) => void;
  onItemCreated?: (newItem: ItemType) => void;
  mode: 'edit' | 'create';
}

// Конфигурация редкостей
const rarityConfig = {
  common: { label: 'Обычный', color: 'text-gray-700' },
  uncommon: { label: 'Необычный', color: 'text-green-700' },
  rare: { label: 'Редкий', color: 'text-blue-700' },
  epic: { label: 'Эпический', color: 'text-purple-700' },
  legendary: { label: 'Легендарный', color: 'text-yellow-700' },
  mythical: { label: 'Мифический', color: 'text-red-700' },
  story: { label: 'Сюжетный', color: 'text-orange-700' }
} as const;

type RarityType = keyof typeof rarityConfig;

export const EditItemModal = ({ 
  item, 
  onClose, 
  onItemUpdated,
  onItemCreated,
  mode = 'edit' 
}: EditItemModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rarity: 'common' as RarityType,
    base_quantity: 1,
    active_effect_id: null as number | null,
    passive_effect_id: null as number | null
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allEffects, setAllEffects] = useState<EffectType[]>([]);
  const [effectsLoading, setEffectsLoading] = useState(false);
  
  // Загрузка всех эффектов для выпадающих списков
  useEffect(() => {
    const loadEffects = async () => {
      setEffectsLoading(true);
      try {
        const response = await fetch('/api/effects');
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
    if (mode === 'edit' && item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        rarity: item.rarity || 'common',
        base_quantity: item.base_quantity || 1,
        active_effect_id: item.active_effect_id || null,
        passive_effect_id: item.passive_effect_id || null
      });
    } else if (mode === 'create') {
      setFormData({
        name: '',
        description: '',
        rarity: 'common',
        base_quantity: 1,
        active_effect_id: null,
        passive_effect_id: null
      });
    }
  }, [item, mode]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setFormData({
        ...formData,
        [name]: value === '' ? 0 : parseInt(value, 10) || 0
      });
    } else if (name === 'active_effect_id' || name === 'passive_effect_id') {
      setFormData({
        ...formData,
        [name]: value === '' ? null : parseInt(value, 10)
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
      setError('Название предмета обязательно');
      setLoading(false);
      return;
    }
    
    if (formData.name.length > 100) {
      setError('Название не должно превышать 100 символов');
      setLoading(false);
      return;
    }
    
    if (formData.base_quantity < 1) {
      setError('Базовое количество должно быть не менее 1');
      setLoading(false);
      return;
    }
    
    if (formData.base_quantity > 999) {
      setError('Базовое количество не должно превышать 999');
      setLoading(false);
      return;
    }
    
    // Проверка уникальности эффектов (не обязательно, но хорошая практика)
    if (formData.active_effect_id && formData.passive_effect_id && 
        formData.active_effect_id === formData.passive_effect_id) {
      setError('Активный и пассивный эффекты не могут быть одинаковыми');
      setLoading(false);
      return;
    }
    
    try {
      let url = '/api/items';
      let method = 'POST';
      
      if (mode === 'edit' && item) {
        url = `/api/items/${item.id}`;
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
        throw new Error(errorData.error || 'Ошибка сохранения предмета');
      }
      
      const result = await response.json();
      
      if (mode === 'edit' && item) {
        onItemUpdated(result.item || result);
      } else if (mode === 'create' && onItemCreated) {
        onItemCreated(result.item || result);
      }
      
      onClose();
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при сохранении предмета');
      console.error('Ошибка сохранения:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (mode !== 'edit' || !item) return;
    
    if (!confirm(`Вы уверены, что хотите удалить предмет "${item.name}"? Это действие нельзя отменить.`)) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка удаления предмета');
      }
      
      onClose();
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при удалении предмета');
      console.error('Ошибка удаления:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const modalTitle = mode === 'edit' 
    ? `Редактирование предмета` 
    : 'Создание нового предмета';
  
  // Функция для получения информации об эффекте
  const getEffectInfo = (effectId: number | null) => {
    if (!effectId || allEffects.length === 0) return null;
    const effect = allEffects.find(e => e.id === effectId);
    if (!effect) return <p className="text-sm text-gray-600">Эффект не найден</p>;
    
    return (
      <div className="text-sm space-y-1">
        <p><span className="font-medium">Название:</span> {effect.name}</p>
        <p><span className="font-medium">Описание:</span> {effect.description}</p>
        <p><span className="font-medium">Атрибут:</span> {effect.attribute || 'нет'}</p>
        <p><span className="font-medium">Модификатор:</span> {effect.modifier > 0 ? '+' : ''}{effect.modifier}</p>
        {effect.is_permanent ? (
          <p><span className="font-medium">Тип:</span> Постоянный</p>
        ) : (
          <>
            {effect.duration_turns && (
              <p><span className="font-medium">Длительность:</span> {effect.duration_turns} ход(ов)</p>
            )}
            {effect.duration_days && (
              <p><span className="font-medium">Длительность:</span> {effect.duration_days} дней</p>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white rounded-lg shadow-xl w-[calc(100%-1rem)] md:w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
                Название предмета *
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
                placeholder="Введите название предмета"
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
                placeholder="Введите описание предмета"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Редкость */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Редкость *
                </label>
                <select
                  name="rarity"
                  value={formData.rarity}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  {Object.entries(rarityConfig).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Базовое количество */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Базовое количество *
                </label>
                <input
                  type="number"
                  name="base_quantity"
                  value={formData.base_quantity}
                  onChange={handleInputChange}
                  min="1"
                  max="999"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Минимум 1, максимум 999</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Активный эффект */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Активный эффект
                </label>
                <select
                  name="active_effect_id"
                  value={formData.active_effect_id || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading || effectsLoading}
                >
                  <option value="">Без активного эффекта</option>
                  {effectsLoading ? (
                    <option disabled>Загрузка эффектов...</option>
                  ) : (
                    allEffects.filter(effect => !effect.is_permanent).map(effect => (
                      <option key={`active-${effect.id}`} value={effect.id}>
                        {effect.name} (ID: {effect.id})
                      </option>
                    ))
                  )}
                </select>
              </div>
              
              {/* Пассивный эффект */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Пассивный эффект
                </label>
                <select
                  name="passive_effect_id"
                  value={formData.passive_effect_id || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading || effectsLoading}
                >
                  <option value="">Без пассивного эффекта</option>
                  {effectsLoading ? (
                    <option disabled>Загрузка эффектов...</option>
                  ) : (
                    allEffects.filter(effect => effect.is_permanent).map(effect => (
                      <option key={`passive-${effect.id}`} value={effect.id}>
                        {effect.name} (ID: {effect.id})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
            
            {/* Информация о выбранных эффектах */}
            {(formData.active_effect_id || formData.passive_effect_id) && (
              <div className="space-y-3">
                {/* Активный эффект информация */}
                {formData.active_effect_id && (
                  <div className="p-3 bg-blue-50 rounded border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-2">Активный эффект:</h4>
                    {getEffectInfo(formData.active_effect_id)}
                  </div>
                )}
                
                {/* Пассивный эффект информация */}
                {formData.passive_effect_id && (
                  <div className="p-3 bg-green-50 rounded border border-green-200">
                    <h4 className="font-medium text-green-800 mb-2">Пассивный эффект:</h4>
                    {getEffectInfo(formData.passive_effect_id)}
                  </div>
                )}
              </div>
            )}        
            
            {/* Кнопки действий */}
            <div className="flex justify-between pt-6 border-t">
              <div>
                {mode === 'edit' && item && (
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
                    : (mode === 'edit' ? 'Сохранить изменения' : 'Создать предмет')
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
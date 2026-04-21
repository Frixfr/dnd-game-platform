// client/src/components/ui/EditEffectModal.tsx
import { useState, useEffect } from 'react';
import type { EffectType } from '../../types';

interface EditEffectModalProps {
  effect: EffectType | null;
  onClose: () => void;
  onEffectUpdated: (updatedEffect: EffectType) => void;
  onEffectCreated?: (newEffect: EffectType) => void;
  mode: 'edit' | 'create';
}

interface FormData {
  name: string;
  description: string;
  attribute: string | null;
  modifier: number;
  duration_turns: number | null;
  duration_days: number | null;
  is_permanent: boolean;
  tags: string[];
}

const ATTRIBUTE_OPTIONS = [
  { value: 'health', label: 'Здоровье' },
  { value: 'max_health', label: 'Макс. здоровье' },
  { value: 'armor', label: 'Броня' },
  { value: 'strength', label: 'Сила' },
  { value: 'agility', label: 'Ловкость' },
  { value: 'intelligence', label: 'Интеллект' },
  { value: 'physique', label: 'Телосложение' },
  { value: 'wisdom', label: 'Мудрость' },
  { value: 'charisma', label: 'Харизма' }
];

export const EditEffectModal = ({ 
  effect, 
  onClose, 
  onEffectUpdated,
  onEffectCreated,
  mode = 'edit' 
}: EditEffectModalProps) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    attribute: null,
    modifier: 0,
    duration_turns: null,
    duration_days: null,
    is_permanent: false,
    tags: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  
  useEffect(() => {
    if (mode === 'edit' && effect) {
      setFormData({
        name: effect.name || '',
        description: effect.description || '',
        attribute: effect.attribute || null,
        modifier: effect.modifier || 0,
        duration_turns: effect.duration_turns || null,
        duration_days: effect.duration_days || null,
        is_permanent: effect.is_permanent || false,
        tags: effect.tags || []           // ← добавлено
      });
    } else if (mode === 'create') {
      setFormData({
        name: '',
        description: '',
        attribute: null,
        modifier: 0,
        duration_turns: null,
        duration_days: null,
        is_permanent: false,
        tags: []
      });
    }
  }, [effect, mode]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      const numValue = value === '' ? null : parseInt(value, 10);
      setFormData({
        ...formData,
        [name]: numValue !== null && !isNaN(numValue) ? numValue : null
      });
    } else if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData({
        ...formData,
        [name]: checkbox.checked
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    
    if (serverErrors[name]) {
      setServerErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Обработчик изменения тегов (строка через запятую)
  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const tagsArray = raw.split(',').map(s => s.trim()).filter(s => s.length > 0);
    setFormData({ ...formData, tags: tagsArray });
    if (serverErrors.tags) {
      setServerErrors(prev => ({ ...prev, tags: '' }));
    }
  };
  
  const handleTogglePermanent = (isPermanent: boolean) => {
    setFormData({
      ...formData,
      is_permanent: isPermanent,
      duration_turns: isPermanent ? null : formData.duration_turns,
      duration_days: isPermanent ? null : formData.duration_days
    });
  };
  
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Название обязательно';
    } else if (formData.name.length > 100) {
      errors.name = 'Название не должно превышать 100 символов';
    }

    if (formData.attribute && !ATTRIBUTE_OPTIONS.some(attr => attr.value === formData.attribute)) {
      errors.attribute = 'Недопустимый атрибут';
    }

    if (formData.modifier < -100 || formData.modifier > 100) {
      errors.modifier = 'Модификатор должен быть в диапазоне от -100 до 100';
    }

    // Новая валидация тегов
    if (formData.tags.length > 10) {
      errors.tags = 'Максимум 10 тегов';
    } else {
      const longTag = formData.tags.find(tag => tag.length > 30);
      if (longTag) {
        errors.tags = `Тег "${longTag}" превышает 30 символов`;
      }
    }

    if (!formData.is_permanent) {
      if (!formData.duration_turns && !formData.duration_days) {
        errors.duration = 'Для непостоянных эффектов укажите длительность';
      } else {
        if (formData.duration_turns !== null && formData.duration_turns <= 0) {
          errors.duration_turns = 'Длительность в ходах должна быть положительной';
        }
        if (formData.duration_days !== null && formData.duration_days <= 0) {
          errors.duration_days = 'Длительность в днях должна быть положительной';
        }
      }
    } else {
      if (formData.duration_turns !== null || formData.duration_days !== null) {
        errors.is_permanent = 'Постоянные эффекты не могут иметь длительность';
      }
    }

    setServerErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setServerErrors({});
    
    if (!validateForm()) {
        setLoading(false);
        return;
    }
    
    const submitData = {
        ...formData,
        description: formData.description || '',
        attribute: formData.attribute || null,
        duration_turns: formData.is_permanent ? null : (formData.duration_turns || null),
        duration_days: formData.is_permanent ? null : (formData.duration_days || null),
        tags: formData.tags
    };
    
    try {
        let url = '/api/effects';
        let method = 'POST';
        
        if (mode === 'edit' && effect) {
          url = `/api/effects/${effect.id}`;
          method = 'PATCH';
        }
        
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Ошибка сохранения эффекта');
        }
        
        const result = await response.json();
        
        if (mode === 'edit' && effect) {
          onEffectUpdated(result.effect || result);
        } else if (mode === 'create' && onEffectCreated) {
          onEffectCreated(result.effect || result);
        }
        
        onClose();
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Произошла ошибка при сохранении эффекта';
        setError(message);
        console.error('Ошибка сохранения:', err);
    } finally {
        setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (mode !== 'edit' || !effect) return;
    
    if (!confirm('Вы уверены, что хотите удалить этот эффект? Это действие нельзя отменить.')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/effects/${effect.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка удаления эффекта');
      }
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Произошла ошибка при удалении эффекта';
      setError(message);
      console.error('Ошибка удаления:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const modalTitle = mode === 'edit' ? 'Редактирование эффекта' : 'Создание нового эффекта';
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white rounded-lg shadow-xl w-[calc(100%-1rem)] md:w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{modalTitle}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl" disabled={loading}>
              &times;
            </button>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Основные поля */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название эффекта *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border ${serverErrors.name ? 'border-red-500' : 'border-gray-300'} rounded focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  required maxLength={100} disabled={loading}
                />
                {serverErrors.name && <p className="mt-1 text-sm text-red-600">{serverErrors.name}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Атрибут</label>
                <select
                  name="attribute"
                  value={formData.attribute || ''}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border ${serverErrors.attribute ? 'border-red-500' : 'border-gray-300'} rounded`}
                  disabled={loading}
                >
                  <option value="">Не выбран</option>
                  {ATTRIBUTE_OPTIONS.map(attr => (
                    <option key={attr.value} value={attr.value}>{attr.label}</option>
                  ))}
                </select>
                {serverErrors.attribute && <p className="mt-1 text-sm text-red-600">{serverErrors.attribute}</p>}
              </div>
            </div>
            
            {/* Описание */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                disabled={loading}
              />
            </div>
            
            {/* Теги (новое поле) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Теги (через запятую)
              </label>
              <input
                type="text"
                value={formData.tags.join(', ')}
                onChange={handleTagsChange}
                className={`w-full px-3 py-2 border ${
                  serverErrors.tags ? 'border-red-500' : 'border-gray-300'
                } rounded focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="например: боевой, расовый, магия"
                disabled={loading}
              />
              {serverErrors.tags && (
                <p className="mt-1 text-sm text-red-600">{serverErrors.tags}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Максимум 10 тегов, каждый до 30 символов</p>
            </div>
            
            {/* Модификатор и тип эффекта */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Модификатор</label>
                <input
                  type="number"
                  name="modifier"
                  min="-100" max="100"
                  value={formData.modifier}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border ${serverErrors.modifier ? 'border-red-500' : 'border-gray-300'} rounded`}
                  disabled={loading}
                />
                {serverErrors.modifier && <p className="mt-1 text-sm text-red-600">{serverErrors.modifier}</p>}
                <div className="mt-2 text-xs text-gray-500">
                  Положительное значение увеличивает атрибут, отрицательное — уменьшает
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Тип эффекта</label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => handleTogglePermanent(false)}
                    className={`flex-1 py-2 px-4 rounded-md border ${
                      !formData.is_permanent ? 'bg-blue-500 text-white border-blue-600' : 'bg-gray-100 text-gray-700'
                    }`}
                    disabled={loading}
                  >
                    Временный
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePermanent(true)}
                    className={`flex-1 py-2 px-4 rounded-md border ${
                      formData.is_permanent ? 'bg-blue-500 text-white border-blue-600' : 'bg-gray-100 text-gray-700'
                    }`}
                    disabled={loading}
                  >
                    Постоянный
                  </button>
                </div>
                {serverErrors.is_permanent && <p className="mt-1 text-sm text-red-600">{serverErrors.is_permanent}</p>}
              </div>
            </div>
            
            {/* Длительность (только для временных эффектов) */}
            {!formData.is_permanent && (
              <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                <h3 className="font-medium text-gray-800 mb-3">Длительность эффекта</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">В ходах</label>
                    <input
                      type="number"
                      name="duration_turns"
                      min="1"
                      value={formData.duration_turns || ''}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border ${serverErrors.duration_turns ? 'border-red-500' : 'border-gray-300'} rounded`}
                      disabled={loading}
                    />
                    {serverErrors.duration_turns && <p className="mt-1 text-sm text-red-600">{serverErrors.duration_turns}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">В днях</label>
                    <input
                      type="number"
                      name="duration_days"
                      min="1"
                      value={formData.duration_days || ''}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border ${serverErrors.duration_days ? 'border-red-500' : 'border-gray-300'} rounded`}
                      disabled={loading}
                    />
                    {serverErrors.duration_days && <p className="mt-1 text-sm text-red-600">{serverErrors.duration_days}</p>}
                  </div>
                </div>
                {serverErrors.duration && <p className="mt-2 text-sm text-red-600">{serverErrors.duration}</p>}
                <div className="mt-2 text-xs text-gray-600">
                  Укажите хотя бы один тип длительности. Если указаны оба, эффект закончится при истечении любого из сроков.
                </div>
              </div>
            )}
            
            {/* Кнопки */}
            <div className="flex justify-between pt-6 border-t">
              <div>
                {mode === 'edit' && effect && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
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
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                  disabled={loading}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  disabled={loading}
                >
                  {loading ? (mode === 'edit' ? 'Сохранение...' : 'Создание...') : (mode === 'edit' ? 'Сохранить изменения' : 'Создать эффект')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
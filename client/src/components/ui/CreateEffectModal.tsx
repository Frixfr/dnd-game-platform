// client/src/components/ui/CreateEffectModal.tsx
import { useState } from 'react';

interface EffectFormData {
  name: string;
  description: string;
  attribute: string | null;
  modifier: number;
  duration_turns: number | null;
  duration_days: number | null;
  is_permanent: boolean;
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

export const CreateEffectModal = ({ onClose }: { onClose: () => void }) => {
  const [formData, setFormData] = useState<EffectFormData>({
    name: '',
    description: '',
    attribute: null,
    modifier: 0,
    duration_turns: null,
    duration_days: null,
    is_permanent: false
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Название обязательно';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Название не должно превышать 100 символов';
    }

    if (formData.attribute && !ATTRIBUTE_OPTIONS.some(attr => attr.value === formData.attribute)) {
      newErrors.attribute = 'Недопустимый атрибут';
    }

    if (formData.modifier < -100 || formData.modifier > 100) {
      newErrors.modifier = 'Модификатор должен быть в диапазоне от -100 до 100';
    }

    if (!formData.is_permanent) {
      if (!formData.duration_turns && !formData.duration_days) {
        newErrors.duration = 'Для непостоянных эффектов укажите длительность';
      } else {
        if (formData.duration_turns !== null && formData.duration_turns <= 0) {
          newErrors.duration_turns = 'Длительность в ходах должна быть положительной';
        }
        if (formData.duration_days !== null && formData.duration_days <= 0) {
          newErrors.duration_days = 'Длительность в днях должна быть положительной';
        }
      }
    } else {
      if (formData.duration_turns !== null || formData.duration_days !== null) {
        newErrors.is_permanent = 'Постоянные эффекты не могут иметь длительность';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('http://localhost:5000/api/effects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          description: formData.description || '',
          attribute: formData.attribute || null,
          duration_turns: formData.duration_turns || null,
          duration_days: formData.duration_days || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка сервера');
      }

      onClose();
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : 'Неизвестная ошибка'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleNumberChange = (field: keyof typeof formData, value: string) => {
    const numValue = value === '' ? null : parseInt(value, 10);
    setFormData(prev => ({ 
      ...prev, 
      [field]: numValue !== null && !isNaN(numValue) ? numValue : null 
    }));
  };

  const handleTogglePermanent = (isPermanent: boolean) => {
    setFormData(prev => ({
      ...prev,
      is_permanent: isPermanent,
      duration_turns: isPermanent ? null : prev.duration_turns,
      duration_days: isPermanent ? null : prev.duration_days
    }));
  };

  const handleModifierChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setFormData(prev => ({ 
        ...prev, 
        modifier: Math.max(-100, Math.min(100, numValue)) 
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Создать эффект</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>

          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md">
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Основные поля */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Название и атрибут */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название эффекта *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Например: Отравление"
                    maxLength={100}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Атрибут
                  </label>
                  <select
                    value={formData.attribute || ''}
                    onChange={(e) => setFormData({...formData, attribute: e.target.value || null})}
                    className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.attribute ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Не выбран</option>
                    {ATTRIBUTE_OPTIONS.map(attr => (
                      <option key={attr.value} value={attr.value}>
                        {attr.label}
                      </option>
                    ))}
                  </select>
                  {errors.attribute && (
                    <p className="mt-1 text-sm text-red-600">{errors.attribute}</p>
                  )}
                </div>
              </div>

              {/* Модификатор и тип эффекта */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Модификатор
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="-100"
                      max="100"
                      value={formData.modifier}
                      onChange={(e) => handleModifierChange(e.target.value)}
                      className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.modifier ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-gray-500">
                        {formData.modifier >= 0 ? '↑' : '↓'}
                      </span>
                    </div>
                  </div>
                  {errors.modifier && (
                    <p className="mt-1 text-sm text-red-600">{errors.modifier}</p>
                  )}
                  <div className="mt-2 text-xs text-gray-500">
                    Положительное значение увеличивает атрибут, отрицательное — уменьшает
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Тип эффекта
                  </label>
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => handleTogglePermanent(false)}
                      className={`flex-1 py-2 px-4 rounded-md border ${
                        !formData.is_permanent
                          ? 'bg-blue-500 text-white border-blue-600'
                          : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      Временный
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTogglePermanent(true)}
                      className={`flex-1 py-2 px-4 rounded-md border ${
                        formData.is_permanent
                          ? 'bg-blue-500 text-white border-blue-600'
                          : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      Постоянный
                    </button>
                  </div>
                  {errors.is_permanent && (
                    <p className="mt-1 text-sm text-red-600">{errors.is_permanent}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Описание */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание эффекта
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Опишите эффект, его проявления и особенности..."
              />
            </div>

            {/* Длительность (только для временных эффектов) */}
            {!formData.is_permanent && (
              <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                <h3 className="font-medium text-gray-800 mb-3">Длительность эффекта</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      В ходах
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.duration_turns || ''}
                      onChange={(e) => handleNumberChange('duration_turns', e.target.value)}
                      className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.duration_turns ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Например: 5"
                    />
                    {errors.duration_turns && (
                      <p className="mt-1 text-sm text-red-600">{errors.duration_turns}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      В днях
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.duration_days || ''}
                      onChange={(e) => handleNumberChange('duration_days', e.target.value)}
                      className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.duration_days ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Например: 3"
                    />
                    {errors.duration_days && (
                      <p className="mt-1 text-sm text-red-600">{errors.duration_days}</p>
                    )}
                  </div>
                </div>
                {errors.duration && (
                  <p className="mt-2 text-sm text-red-600">{errors.duration}</p>
                )}
                <div className="mt-2 text-xs text-gray-600">
                  Укажите хотя бы один тип длительности. Если указаны оба, эффект закончится при истечении любого из сроков.
                </div>
              </div>
            )}

            {/* Предпросмотр эффекта */}
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h3 className="font-medium text-gray-800 mb-2">Предпросмотр</h3>
              <div className="text-sm text-gray-600">
                <div className="space-y-1">
                  <div><span className="font-medium">Название:</span> {formData.name || 'Не указано'}</div>
                  {formData.attribute && (
                    <div><span className="font-medium">Атрибут:</span> {
                      ATTRIBUTE_OPTIONS.find(a => a.value === formData.attribute)?.label || formData.attribute
                    }</div>
                  )}
                  <div><span className="font-medium">Модификатор:</span> 
                    <span className={formData.modifier >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {' '}{formData.modifier >= 0 ? '+' : ''}{formData.modifier}
                    </span>
                  </div>
                  <div><span className="font-medium">Тип:</span> {formData.is_permanent ? 'Постоянный' : 'Временный'}</div>
                  {!formData.is_permanent && (
                    <div>
                      <span className="font-medium">Длительность:</span> 
                      {formData.duration_turns && ` ${formData.duration_turns} ходов`}
                      {formData.duration_turns && formData.duration_days && ' или '}
                      {formData.duration_days && ` ${formData.duration_days} дней`}
                      {!formData.duration_turns && !formData.duration_days && ' Не указана'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Кнопки действий */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                disabled={submitting}
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Создание...' : 'Создать эффект'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
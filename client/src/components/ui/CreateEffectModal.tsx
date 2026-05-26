// client/src/components/ui/CreateEffectModal.tsx (полный файл с изменениями)
import { useState } from 'react';

interface EffectFormData {
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

export const CreateEffectModal = ({ onClose }: { onClose: () => void }) => {
  const [formData, setFormData] = useState<EffectFormData>({
    name: '',
    description: '',
    attribute: null,
    modifier: 0,
    duration_turns: null,
    duration_days: null,
    is_permanent: false,
    tags: [],
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

    // Валидация тегов
    if (formData.tags.length > 10) {
      newErrors.tags = 'Максимум 10 тегов';
    } else {
      const longTag = formData.tags.find(tag => tag.length > 30);
      if (longTag) {
        newErrors.tags = `Тег "${longTag}" превышает 30 символов`;
      }
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
      const response = await fetch('/api/effects', {  // ← изменён URL
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || '',
          attribute: formData.attribute || null,
          modifier: formData.modifier,
          duration_turns: formData.is_permanent ? null : (formData.duration_turns || null),
          duration_days: formData.is_permanent ? null : (formData.duration_days || null),
          is_permanent: formData.is_permanent,
          tags: formData.tags
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

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const tagsArray = raw.split(',').map(s => s.trim()).filter(s => s.length > 0);
    setFormData({...formData, tags: tagsArray});
    // очищаем ошибку тегов при изменении
    if (errors.tags) {
      setErrors(prev => ({ ...prev, tags: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#0A1F44] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[#F2E9E4]/20">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#F2E9E4]">Создать эффект</h2>
            <button
              onClick={onClose}
              className="text-[#F2E9E4]/60 hover:text-[#F2E9E4] text-xl"
            >
              ×
            </button>
          </div>

          {errors.submit && (
            <div className="mb-4 p-3 bg-[#FF0026]/20 border border-[#FF0026]/30 text-[#FF0026] rounded-md">
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Основные поля */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#F2E9E4] mb-1">
                    Название эффекта *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-[#FF0026] focus:border-[#FF0026] bg-[#0A1F44] text-[#F2E9E4] ${
                      errors.name ? 'border-[#FF0026]' : 'border-[#F2E9E4]/30'
                    }`}
                    placeholder="Например: Отравление"
                    maxLength={100}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-[#FF0026]">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#F2E9E4] mb-1">
                    Атрибут
                  </label>
                  <select
                    value={formData.attribute || ''}
                    onChange={(e) => setFormData({...formData, attribute: e.target.value || null})}
                    className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-[#FF0026] focus:border-[#FF0026] bg-[#0A1F44] text-[#F2E9E4] ${
                      errors.attribute ? 'border-[#FF0026]' : 'border-[#F2E9E4]/30'
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
                    <p className="mt-1 text-sm text-[#FF0026]">{errors.attribute}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#F2E9E4] mb-1">
                    Модификатор
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="-100"
                      max="100"
                      value={formData.modifier}
                      onChange={(e) => handleModifierChange(e.target.value)}
                      className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-[#FF0026] focus:border-[#FF0026] bg-[#0A1F44] text-[#F2E9E4] ${
                        errors.modifier ? 'border-[#FF0026]' : 'border-[#F2E9E4]/30'
                      }`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-[#F2E9E4]/60">
                        {formData.modifier >= 0 ? '↑' : '↓'}
                      </span>
                    </div>
                  </div>
                  {errors.modifier && (
                    <p className="mt-1 text-sm text-[#FF0026]">{errors.modifier}</p>
                  )}
                  <div className="mt-2 text-xs text-[#F2E9E4]/60">
                    Положительное значение увеличивает атрибут, отрицательное — уменьшает
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#F2E9E4] mb-3">
                    Тип эффекта
                  </label>
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => handleTogglePermanent(false)}
                      className={`flex-1 py-2 px-4 rounded-md border transition-colors ${
                        !formData.is_permanent
                          ? 'bg-[#FF0026] text-white border-[#FF0026]'
                          : 'bg-[#0A1F44] text-[#F2E9E4] border-[#F2E9E4]/30 hover:bg-[#0A1F44]/80'
                      }`}
                    >
                      Временный
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTogglePermanent(true)}
                      className={`flex-1 py-2 px-4 rounded-md border transition-colors ${
                        formData.is_permanent
                          ? 'bg-[#FF0026] text-white border-[#FF0026]'
                          : 'bg-[#0A1F44] text-[#F2E9E4] border-[#F2E9E4]/30 hover:bg-[#0A1F44]/80'
                      }`}
                    >
                      Постоянный
                    </button>
                  </div>
                  {errors.is_permanent && (
                    <p className="mt-1 text-sm text-[#FF0026]">{errors.is_permanent}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Описание */}
            <div>
              <label className="block text-sm font-medium text-[#F2E9E4] mb-1">
                Описание эффекта
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full p-2 border border-[#F2E9E4]/30 rounded-md focus:ring-2 focus:ring-[#FF0026] focus:border-[#FF0026] bg-[#0A1F44] text-[#F2E9E4]"
                rows={3}
                placeholder="Опишите эффект, его проявления и особенности..."
              />
            </div>

            {/* Теги */}
            <div>
              <label className="block text-sm font-medium text-[#F2E9E4] mb-1">
                Теги (через запятую)
              </label>
              <input
                type="text"
                value={formData.tags.join(', ')}
                onChange={handleTagsChange}
                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-[#FF0026] bg-[#0A1F44] text-[#F2E9E4] ${
                  errors.tags ? 'border-[#FF0026]' : 'border-[#F2E9E4]/30'
                }`}
                placeholder="например: боевой, расовый, магия"
              />
              {errors.tags && (
                <p className="mt-1 text-sm text-[#FF0026]">{errors.tags}</p>
              )}
              <p className="text-xs text-[#F2E9E4]/60 mt-1">Максимум 10 тегов, каждый до 30 символов</p>
            </div>

            {/* Длительность (только для временных эффектов) */}
            {!formData.is_permanent && (
              <div className="bg-[#0A1F44]/80 p-4 rounded-md border border-[#F2E9E4]/20">
                <h3 className="font-medium text-[#F2E9E4] mb-3">Длительность эффекта</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#F2E9E4] mb-1">
                      В ходах
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.duration_turns || ''}
                      onChange={(e) => handleNumberChange('duration_turns', e.target.value)}
                      className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-[#FF0026] focus:border-[#FF0026] bg-[#0A1F44] text-[#F2E9E4] ${
                        errors.duration_turns ? 'border-[#FF0026]' : 'border-[#F2E9E4]/30'
                      }`}
                      placeholder="Например: 5"
                    />
                    {errors.duration_turns && (
                      <p className="mt-1 text-sm text-[#FF0026]">{errors.duration_turns}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#F2E9E4] mb-1">
                      В днях
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.duration_days || ''}
                      onChange={(e) => handleNumberChange('duration_days', e.target.value)}
                      className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-[#FF0026] focus:border-[#FF0026] bg-[#0A1F44] text-[#F2E9E4] ${
                        errors.duration_days ? 'border-[#FF0026]' : 'border-[#F2E9E4]/30'
                      }`}
                      placeholder="Например: 3"
                    />
                    {errors.duration_days && (
                      <p className="mt-1 text-sm text-[#FF0026]">{errors.duration_days}</p>
                    )}
                  </div>
                </div>
                {errors.duration && (
                  <p className="mt-2 text-sm text-[#FF0026]">{errors.duration}</p>
                )}
                <div className="mt-2 text-xs text-[#F2E9E4]/60">
                  Укажите хотя бы один тип длительности. Если указаны оба, эффект закончится при истечении любого из сроков.
                </div>
              </div>
            )}

            {/* Кнопки действий */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-[#F2E9E4]/20">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-[#F2E9E4] bg-[#0A1F44] hover:bg-[#0A1F44]/80 border border-[#F2E9E4]/30 rounded-md transition-colors"
                disabled={submitting}
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-[#FF0026] text-white rounded-md hover:bg-[#FF0026]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
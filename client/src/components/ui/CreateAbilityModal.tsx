// client/src/components/ui/CreateAbilityModal.tsx
import { useState } from 'react';
import type { EffectType } from '../../types';

interface CreateAbilityModalProps {
  onClose: () => void;
  effects?: EffectType[];
}

export const CreateAbilityModal = ({ 
  onClose, 
  effects = [] 
}: CreateAbilityModalProps) => {
  const [formData, setFormData] = useState<{
    name: string;
    description: string;        // ← только string, не null
    ability_type: 'active' | 'passive';
    cooldown_turns: number;
    cooldown_days: number;
    effect_id: number | null;
  }>({
    name: '',
    description: '',            // ← пустая строка
    ability_type: 'active',
    cooldown_turns: 0,
    cooldown_days: 0,
    effect_id: null,
  });
    
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
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
      const response = await fetch('/api/abilities', {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="modal-content w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold modal-title">Создать способность</h2>
            <button
              onClick={onClose}
              className="text-[#F2E9E4]/60 hover:text-[#F2E9E4] text-2xl"
            >
              ×
            </button>
          </div>
          
          {error && (
            <div className="mb-4 p-3 rounded-xl border border-[#FF0026]/30 bg-[#FF0026]/10 text-[#FF0026] text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 rounded-xl border border-green-500/30 bg-green-500/10 text-green-400 text-sm">
              {success}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label block mb-2">
                  Название способности *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="form-input w-full"
                  placeholder="Введите название способности"
                  maxLength={100}
                  required
                />
                <div className="text-xs text-[#F2E9E4]/60 mt-1">
                  {formData.name.length}/100 символов
                </div>
              </div>
              
              <div>
                <label className="form-label block mb-2">
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
                      className="w-4 h-4"
                    />
                    <span>Активная</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="ability_type"
                      value="passive"
                      checked={formData.ability_type === 'passive'}
                      onChange={(e) => setFormData({...formData, ability_type: e.target.value as 'active' | 'passive'})}
                      className="w-4 h-4"
                    />
                    <span>Пассивная</span>
                  </label>
                </div>
                <div className="text-xs text-[#F2E9E4]/60 mt-1">
                  {formData.ability_type === 'active' 
                    ? 'Требует активации игроком' 
                    : 'Работает постоянно'}
                </div>
              </div>
            </div>
            
            <div>
              <label className="form-label block mb-2">
                Описание
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="form-textarea w-full resize-none h-32"
                placeholder="Опишите способность, её эффекты и особенности..."
                maxLength={500}
              />
              <div className="text-xs text-[#F2E9E4]/60 mt-1">
                {formData.description.length}/500 символов
              </div>
            </div>
            
            {formData.ability_type === 'active' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label block mb-2">
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
                    className="form-input w-full"
                    placeholder="0"
                  />
                  <div className="text-xs text-[#F2E9E4]/60 mt-1">
                    Количество ходов до повторного использования
                  </div>
                </div>
                
                <div>
                  <label className="form-label block mb-2">
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
                    className="form-input w-full"
                    placeholder="0"
                  />
                  <div className="text-xs text-[#F2E9E4]/60 mt-1">
                    Количество дней до повторного использования
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <label className="form-label block mb-2">
                Связанный эффект
              </label>
              <select
                value={formData.effect_id || ''}
                onChange={handleEffectChange}
                className="form-select w-full"
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
              <div className="text-xs text-[#F2E9E4]/60 mt-1">
                Выберите эффект, который применяет эта способность (необязательно)
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-6 border-t border-[#F2E9E4]/20">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={loading}
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
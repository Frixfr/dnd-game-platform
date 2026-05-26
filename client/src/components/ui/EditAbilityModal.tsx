// client/src/components/ui/EditAbilityModal.tsx
import { useState, useEffect } from 'react';
import type { AbilityType, EffectType } from '../../types';
import { useConfirm } from '../../hooks/useConfirm';

interface EditAbilityModalProps {
  ability: AbilityType | null;
  onClose: () => void;
  onAbilityUpdated: (updatedAbility: AbilityType) => void;
  onAbilityCreated?: (newAbility: AbilityType) => void;
  mode: 'edit' | 'create';
  effects?: EffectType[];
}

export const EditAbilityModal = ({ 
  ability, 
  onClose, 
  onAbilityUpdated,
  onAbilityCreated,
  mode = 'edit',
  effects: externalEffects = []
}: EditAbilityModalProps) => {
  const { confirm, ConfirmModalComponent } = useConfirm();
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
  const [allEffects, setAllEffects] = useState<EffectType[]>(externalEffects);
  const [effectsLoading, setEffectsLoading] = useState(false);
  
  useEffect(() => {
    if (externalEffects.length === 0) {
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
    } else {
      setAllEffects(externalEffects);
    }
  }, [externalEffects]);
  
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
        [name]: value,
      });
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
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
      let url = '/api/abilities';
      let method = 'POST';
      
      if (mode === 'edit' && ability) {
        url = `/api/abilities/${ability.id}`;
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Произошла ошибка при сохранении способности';
      setError(message);
      console.error('Ошибка сохранения:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = () => {
    if (mode !== 'edit' || !ability) return;
    confirm({
      message: 'Вы уверены, что хотите удалить эту способность? Это действие нельзя отменить.',
      onConfirm: async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/abilities/${ability.id}`, {
            method: 'DELETE',
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка удаления способности');
          }
          onClose();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Произошла ошибка при удалении способности';
          setError(message);
          console.error('Ошибка удаления:', err);
        } finally {
          setLoading(false);
        }
      }
    });
  };
  
  const modalTitle = mode === 'edit' ? `Редактирование способности` : 'Создание новой способности';
  
  return (
    <div className="fixed inset-0 bg-midnight-blue/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
      <div className="modal-content w-[calc(100%-1rem)] md:w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h2 className="modal-title">{modalTitle}</h2>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-2xl transition-colors" disabled={loading}>&times;</button>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-accent-red/10 border border-accent-red/30 text-accent-red rounded text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Название способности *</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="form-input" required maxLength={100} disabled={loading} placeholder="Введите название способности" />
            </div>
            
            <div>
              <label className="form-label">Описание</label>
              <textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} className="form-textarea" disabled={loading} placeholder="Введите описание способности" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Тип способности *</label>
                <select name="ability_type" value={formData.ability_type} onChange={handleInputChange} className="form-select" disabled={loading}>
                  <option value="active">Активная</option>
                  <option value="passive">Пассивная</option>
                </select>
              </div>
              
              <div>
                <label className="form-label">Связанный эффект</label>
                <select name="effect_id" value={formData.effect_id || ''} onChange={handleInputChange} className="form-select" disabled={loading || effectsLoading}>
                  <option value="">Без эффекта</option>
                  {effectsLoading ? <option disabled>Загрузка эффектов...</option> : allEffects.filter(effect => formData.ability_type === 'passive' ? effect.is_permanent : !effect.is_permanent).map(effect => <option key={effect.id} value={effect.id}>{effect.name} (ID: {effect.id})</option>)}
                </select>
              </div>
            </div>
            
            {formData.ability_type === 'active' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Перезарядка (ходов)</label>
                  <input type="number" name="cooldown_turns" value={formData.cooldown_turns} onChange={handleInputChange} min="0" className="form-input" disabled={loading} />
                  <p className="text-xs text-text-secondary mt-1">0 = нет перезарядки</p>
                </div>
                <div>
                  <label className="form-label">Перезарядка (дней)</label>
                  <input type="number" name="cooldown_days" value={formData.cooldown_days} onChange={handleInputChange} min="0" className="form-input" disabled={loading} />
                  <p className="text-xs text-text-secondary mt-1">0 = нет перезарядки</p>
                </div>
              </div>
            )}
            
            {formData.effect_id && allEffects.length > 0 && (
              <div className="card p-3">
                <h4 className="font-medium text-accent-red mb-2">Информация о эффекте:</h4>
                {(() => {
                  const effect = allEffects.find(e => e.id === formData.effect_id);
                  if (!effect) return <p className="text-sm text-text-secondary">Эффект не найден</p>;
                  return (
                    <div className="text-sm text-text-primary">
                      <p><span className="font-medium">Название:</span> {effect.name}</p>
                      <p><span className="font-medium">Описание:</span> {effect.description}</p>
                      <p><span className="font-medium">Атрибут:</span> {effect.attribute}</p>
                      <p><span className="font-medium">Модификатор:</span> {effect.modifier > 0 ? '+' : ''}{effect.modifier}</p>
                      {effect.duration_turns && <p><span className="font-medium">Длительность:</span> {effect.duration_turns} ход(ов)</p>}
                    </div>
                  );
                })()}
              </div>
            )}
            
            <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 pt-4 border-t border-border-color">
              <div className="w-full sm:w-auto">
                {mode === 'edit' && ability && (
                  <button type="button" onClick={handleDelete} className="btn-danger w-full sm:w-auto">
                    {loading ? 'Удаление...' : 'Удалить'}
                  </button>
                )}
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>Отмена</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? (mode === 'edit' ? 'Сохранение...' : 'Создание...') : (mode === 'edit' ? 'Сохранить изменения' : 'Создать способность')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      {ConfirmModalComponent}
    </div>
  );
};
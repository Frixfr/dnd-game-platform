// client/src/components/ui/CreateItemModal.tsx
import { useState, useEffect } from 'react';
import type { EffectType, RarityType } from '../../types';

interface CreateItemModalProps {
  onClose: () => void;
  onItemCreated?: () => void;
}

export const CreateItemModal = ({ onClose, onItemCreated }: CreateItemModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rarity: 'common' as RarityType,
    base_quantity: 1,
    is_deletable: true,
    is_usable: true,
    infinite_uses: false,
    active_effect_ids: [] as number[],
    passive_effect_ids: [] as number[],
  });
  const [allEffects, setAllEffects] = useState<EffectType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/effects?limit=9999')
      .then(res => res.json())
      .then(data => setAllEffects(Array.isArray(data) ? data : data.data || []))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Ошибка создания');
      }
      onItemCreated?.();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleMultiSelect = (field: 'active_effect_ids' | 'passive_effect_ids', e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, opt => Number(opt.value));
    setFormData(prev => ({ ...prev, [field]: selected }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Создать предмет</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
          </div>
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Название *</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded" required maxLength={100} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Описание</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Редкость</label>
                <select value={formData.rarity} onChange={e => setFormData({...formData, rarity: e.target.value as RarityType})} className="w-full p-2 border rounded">
                  <option value="common">Обычный</option><option value="uncommon">Необычный</option>
                  <option value="rare">Редкий</option><option value="epic">Эпический</option>
                  <option value="legendary">Легендарный</option><option value="mythical">Мифический</option>
                  <option value="story">Сюжетный</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Базовое количество</label>
                <input type="number" min="1" value={formData.base_quantity} onChange={e => setFormData({...formData, base_quantity: Number(e.target.value)})} className="w-full p-2 border rounded" />
              </div>
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2"><input type="checkbox" checked={formData.is_deletable} onChange={e => setFormData({...formData, is_deletable: e.target.checked})} /> Можно выбросить/передать</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={formData.is_usable} onChange={e => setFormData({...formData, is_usable: e.target.checked})} /> Можно использовать</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={formData.infinite_uses} onChange={e => setFormData({...formData, infinite_uses: e.target.checked})} /> Бесконечное количество</label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Активные эффекты (Ctrl+клик для выбора нескольких)</label>
              <select multiple value={formData.active_effect_ids.map(String)} onChange={(e) => handleMultiSelect('active_effect_ids', e)} className="w-full p-2 border rounded h-32">
                {allEffects.map(effect => (
                  <option key={effect.id} value={effect.id}>{effect.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Пассивные эффекты (Ctrl+клик для выбора нескольких)</label>
              <select multiple value={formData.passive_effect_ids.map(String)} onChange={(e) => handleMultiSelect('passive_effect_ids', e)} className="w-full p-2 border rounded h-32">
                {allEffects.map(effect => (
                  <option key={effect.id} value={effect.id}>{effect.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Отмена</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50">Создать</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
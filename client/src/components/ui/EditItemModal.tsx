// client/src/components/ui/EditItemModal.tsx
import { useState, useEffect } from 'react';
import type { ItemType, EffectType } from '../../types';
import { useNotification } from '../../hooks/useNotification';

interface EditItemModalProps {
  item: ItemType | null;
  onClose: () => void;
  onItemUpdated: (updatedItem: ItemType) => void;
  mode: 'edit' | 'create';
}

const rarityConfig = {
  common: 'Обычный', uncommon: 'Необычный', rare: 'Редкий',
  epic: 'Эпический', legendary: 'Легендарный', mythical: 'Мифический', story: 'Сюжетный'
} as const;
type RarityType = keyof typeof rarityConfig;

export const EditItemModal = ({ item, onClose, onItemUpdated, mode = 'edit' }: EditItemModalProps) => {
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allEffects, setAllEffects] = useState<EffectType[]>([]);
  const { showError } = useNotification();

  useEffect(() => {
    fetch('/api/effects?limit=9999')
      .then(res => res.json())
      .then(data => setAllEffects(Array.isArray(data) ? data : data.data || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (mode === 'edit' && item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        rarity: item.rarity as RarityType,
        base_quantity: item.base_quantity || 1,
        is_deletable: item.is_deletable ?? true,
        is_usable: item.is_usable ?? true,
        infinite_uses: item.infinite_uses ?? false,
        active_effect_ids: (item.active_effects || []).map(e => e.id),
        passive_effect_ids: (item.passive_effects || []).map(e => e.id),
      });
    } else if (mode === 'create') {
      setFormData({
        name: '', description: '', rarity: 'common', base_quantity: 1,
        is_deletable: true, is_usable: true, infinite_uses: false,
        active_effect_ids: [], passive_effect_ids: [],
      });
    }
  }, [item, mode]);

  const handleMultiSelect = (field: 'active_effect_ids' | 'passive_effect_ids', e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, opt => Number(opt.value));
    setFormData(prev => ({ ...prev, [field]: selected }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!formData.name.trim()) {
      setError('Название обязательно');
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Ошибка сохранения');
      }
      const result = await response.json();
      onItemUpdated(result.item || result);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (mode !== 'edit' || !item) return;
    if (!confirm(`Удалить "${item.name}"?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Ошибка удаления');
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{mode === 'edit' ? 'Редактировать предмет' : 'Создать предмет'}</h2>
          <button onClick={onClose} className="text-gray-500 text-2xl">&times;</button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" name="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Название" className="w-full p-2 border rounded" required />
          <textarea name="description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Описание" rows={3} className="w-full p-2 border rounded" />
          <div className="grid grid-cols-2 gap-4">
            <select value={formData.rarity} onChange={e => setFormData({...formData, rarity: e.target.value as RarityType})} className="p-2 border rounded">
              {Object.entries(rarityConfig).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="number" min="1" value={formData.base_quantity} onChange={e => setFormData({...formData, base_quantity: Number(e.target.value)})} className="p-2 border rounded" />
          </div>
          <div className="flex gap-4">
            <label><input type="checkbox" checked={formData.is_deletable} onChange={e => setFormData({...formData, is_deletable: e.target.checked})} /> Выбрасываемый</label>
            <label><input type="checkbox" checked={formData.is_usable} onChange={e => setFormData({...formData, is_usable: e.target.checked})} /> Используемый</label>
            <label><input type="checkbox" checked={formData.infinite_uses} onChange={e => setFormData({...formData, infinite_uses: e.target.checked})} /> Бесконечный</label>
          </div>
          <div>
            <label className="block text-sm font-medium">Активные эффекты (Ctrl+клик)</label>
            <select multiple value={formData.active_effect_ids.map(String)} onChange={e => handleMultiSelect('active_effect_ids', e)} className="w-full p-2 border rounded h-32">
              {allEffects.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Пассивные эффекты (Ctrl+клик)</label>
            <select multiple value={formData.passive_effect_ids.map(String)} onChange={e => handleMultiSelect('passive_effect_ids', e)} className="w-full p-2 border rounded h-32">
              {allEffects.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="flex justify-between pt-4 border-t">
            {mode === 'edit' && <button type="button" onClick={handleDelete} className="px-4 py-2 bg-red-500 text-white rounded">Удалить</button>}
            <div className="flex gap-2 ml-auto">
              <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Отмена</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-500 text-white rounded">Сохранить</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
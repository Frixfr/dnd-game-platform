// client/src/components/ui/EditItemModal.tsx
import { useState, useEffect, useMemo } from 'react';
import type { ItemType, EffectType } from '../../types';
import { SelectedEffectsList } from './SelectedEffectsList';
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
    is_deletable: true,
    is_usable: true,
    infinite_uses: false,
    active_effect_ids: [] as number[],
    passive_effect_ids: [] as number[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allEffects, setAllEffects] = useState<EffectType[]>([]);
  
  const [activeSearch, setActiveSearch] = useState('');
  const [passiveSearch, setPassiveSearch] = useState('');
  const [selectedActiveEffectId, setSelectedActiveEffectId] = useState<string>('');
  const [selectedPassiveEffectId, setSelectedPassiveEffectId] = useState<string>('');
  
  const { showError } = useNotification();

  useEffect(() => {
    fetch('/api/effects?limit=9999')
      .then(res => res.json())
      .then(data => setAllEffects(Array.isArray(data) ? data : data.data || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (mode === 'edit' && item) {
      const activeIds = (item.effects || [])
        .filter(e => e.effect_type === 'active')
        .map(e => e.id);
      const passiveIds = (item.effects || [])
        .filter(e => e.effect_type === 'passive')
        .map(e => e.id);
      setFormData({
        name: item.name || '',
        description: item.description || '',
        rarity: item.rarity as RarityType,
        is_deletable: item.is_deletable ?? true,
        is_usable: item.is_usable ?? true,
        infinite_uses: item.infinite_uses ?? false,
        active_effect_ids: activeIds,
        passive_effect_ids: passiveIds,
      });
    } else if (mode === 'create') {
      setFormData({
        name: '', description: '', rarity: 'common',
        is_deletable: true, is_usable: true, infinite_uses: false,
        active_effect_ids: [], passive_effect_ids: [],
      });
    }
  }, [item, mode]);

  const isActiveEffect = (effect: EffectType) => !effect.is_permanent;
  const isPassiveEffect = (effect: EffectType) => effect.is_permanent;

  const filterEffects = (effects: EffectType[], search: string) => {
    if (!search.trim()) return effects;
    const lowerSearch = search.toLowerCase();
    return effects.filter(e => 
      e.name.toLowerCase().includes(lowerSearch) ||
      e.tags.some(tag => tag.toLowerCase().includes(lowerSearch))
    );
  };

  const availableActiveEffects = useMemo(() => {
    const activeCandidates = allEffects.filter(isActiveEffect);
    const notUsed = activeCandidates.filter(e => !formData.active_effect_ids.includes(e.id));
    return filterEffects(notUsed, activeSearch);
  }, [allEffects, formData.active_effect_ids, activeSearch]);

  const availablePassiveEffects = useMemo(() => {
    const passiveCandidates = allEffects.filter(isPassiveEffect);
    const notUsed = passiveCandidates.filter(e => !formData.passive_effect_ids.includes(e.id));
    return filterEffects(notUsed, passiveSearch);
  }, [allEffects, formData.passive_effect_ids, passiveSearch]);

  const handleAddActiveEffect = () => {
    const effectId = Number(selectedActiveEffectId);
    if (!effectId || isNaN(effectId)) return;
    if (formData.active_effect_ids.includes(effectId)) {
      setError('Этот эффект уже добавлен в активные');
      return;
    }
    setFormData(prev => ({ ...prev, active_effect_ids: [...prev.active_effect_ids, effectId] }));
    setSelectedActiveEffectId('');
    setActiveSearch('');
  };

  const handleAddPassiveEffect = () => {
    const effectId = Number(selectedPassiveEffectId);
    if (!effectId || isNaN(effectId)) return;
    if (formData.passive_effect_ids.includes(effectId)) {
      setError('Этот эффект уже добавлен в пассивные');
      return;
    }
    setFormData(prev => ({ ...prev, passive_effect_ids: [...prev.passive_effect_ids, effectId] }));
    setSelectedPassiveEffectId('');
    setPassiveSearch('');
  };

  const handleRemoveEffect = (list: 'active' | 'passive', effectId: number) => {
    if (list === 'active') {
      setFormData(prev => ({ ...prev, active_effect_ids: prev.active_effect_ids.filter(id => id !== effectId) }));
    } else {
      setFormData(prev => ({ ...prev, passive_effect_ids: prev.passive_effect_ids.filter(id => id !== effectId) }));
    }
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
        body: JSON.stringify({
          ...formData,
          base_quantity: 1,
        }),
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

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const getEffectById = (id: number) => allEffects.find(e => e.id === id);

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            {mode === 'edit' ? '✏️ Редактирование предмета' : '📦 Создание предмета'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none"
                placeholder="Название предмета"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Редкость</label>
              <select
                value={formData.rarity}
                onChange={e => setFormData({...formData, rarity: e.target.value as RarityType})}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none"
              >
                {Object.entries(rarityConfig).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="Описание предмета..."
            />
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_deletable}
                onChange={e => setFormData({...formData, is_deletable: e.target.checked})}
                className="w-4 h-4 text-blue-500 rounded focus:ring-blue-400"
              />
              <span className="text-sm text-gray-700">🗑️ Можно выбросить/передать</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_usable}
                onChange={e => setFormData({...formData, is_usable: e.target.checked})}
                className="w-4 h-4 text-blue-500 rounded focus:ring-blue-400"
              />
              <span className="text-sm text-gray-700">⚡ Можно использовать</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.infinite_uses}
                onChange={e => setFormData({...formData, infinite_uses: e.target.checked})}
                className="w-4 h-4 text-blue-500 rounded focus:ring-blue-400"
              />
              <span className="text-sm text-gray-700">♾️ Бесконечное количество</span>
            </label>
          </div>

          {/* Активные эффекты */}
          <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <span className="text-lg">✨</span> Активные эффекты
            </h3>
            <SelectedEffectsList
              effects={formData.active_effect_ids.map(id => getEffectById(id)).filter((e): e is EffectType => !!e)}
              onRemove={(id) => handleRemoveEffect('active', id)}
              emptyText="Нет активных эффектов"
            />
            <div className="space-y-2">
              <input
                type="text"
                placeholder="🔍 Поиск по названию или тегам..."
                value={activeSearch}
                onChange={(e) => setActiveSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm"
              />
              <div className="flex gap-2">
                <select
                  value={selectedActiveEffectId}
                  onChange={(e) => setSelectedActiveEffectId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm"
                  size={Math.min(5, availableActiveEffects.length + 1)}
                >
                  <option value="">-- Выберите эффект --</option>
                  {availableActiveEffects.map(effect => (
                    <option key={effect.id} value={effect.id}>
                      {effect.name} {effect.modifier !== 0 && (effect.modifier > 0 ? `+${effect.modifier}` : effect.modifier)}
                      {effect.duration_turns && ` (${effect.duration_turns} ходов)`}
                      {effect.duration_days && ` (${effect.duration_days} дней)`}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddActiveEffect}
                  disabled={!selectedActiveEffectId}
                  className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition disabled:opacity-50"
                >
                  + Добавить
                </button>
              </div>
            </div>
          </div>

          {/* Пассивные эффекты */}
          <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <span className="text-lg">🛡️</span> Пассивные эффекты
            </h3>
            <SelectedEffectsList
              effects={formData.passive_effect_ids.map(id => getEffectById(id)).filter((e): e is EffectType => !!e)}
              onRemove={(id) => handleRemoveEffect('passive', id)}
              emptyText="Нет пассивных эффектов"
            />
            <div className="space-y-2">
              <input
                type="text"
                placeholder="🔍 Поиск по названию или тегам..."
                value={passiveSearch}
                onChange={(e) => setPassiveSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm"
              />
              <div className="flex gap-2">
                <select
                  value={selectedPassiveEffectId}
                  onChange={(e) => setSelectedPassiveEffectId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm"
                  size={Math.min(5, availablePassiveEffects.length + 1)}
                >
                  <option value="">-- Выберите эффект --</option>
                  {availablePassiveEffects.map(effect => (
                    <option key={effect.id} value={effect.id}>
                      {effect.name} {effect.modifier !== 0 && (effect.modifier > 0 ? `+${effect.modifier}` : effect.modifier)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddPassiveEffect}
                  disabled={!selectedPassiveEffectId}
                  className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition disabled:opacity-50"
                >
                  + Добавить
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            {mode === 'edit' && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-5 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition"
              >
                🗑️ Удалить предмет
              </button>
            )}
            <div className="flex gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition text-gray-700"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition disabled:opacity-50"
              >
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
    </div>
  );
};
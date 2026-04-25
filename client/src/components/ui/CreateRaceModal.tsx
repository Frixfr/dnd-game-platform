// client/src/components/ui/CreateRaceModal.tsx
import { useState, useEffect, useMemo } from 'react';
import { useRaceStore } from '../../stores/raceStore';
import { useEffectStore } from '../../stores/effectStore';
import { SelectedEffectsList } from './SelectedEffectsList';
import type { EffectType } from '../../types';

export const CreateRaceModal = ({ onClose }: { onClose: () => void }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [effectIds, setEffectIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEffectId, setSelectedEffectId] = useState<string>('');
  
  const { fetchRaces } = useRaceStore();
  const { fetchAllEffects, effects } = useEffectStore();

  useEffect(() => {
    fetchAllEffects();
  }, [fetchAllEffects]);

  // Фильтр только пассивных эффектов (is_permanent = 1)
  const isPassiveEffect = (effect: EffectType) => !!effect.is_permanent;

  const passiveEffects = useMemo(() => {
    return effects.filter(isPassiveEffect);
  }, [effects]);

  const availableEffects = useMemo(() => {
    const notSelected = passiveEffects.filter(e => !effectIds.includes(e.id));
    if (!searchTerm.trim()) return notSelected;
    const lower = searchTerm.toLowerCase();
    return notSelected.filter(e => 
      e.name.toLowerCase().includes(lower) ||
      e.tags.some(tag => tag.toLowerCase().includes(lower))
    );
  }, [passiveEffects, effectIds, searchTerm]);

  const handleAddEffect = () => {
    const id = Number(selectedEffectId);
    if (!id || isNaN(id)) return;
    if (effectIds.includes(id)) {
      setError('Этот эффект уже добавлен');
      return;
    }
    setEffectIds(prev => [...prev, id]);
    setSelectedEffectId('');
    setSearchTerm('');
  };

  const handleRemoveEffect = (id: number) => {
    setEffectIds(prev => prev.filter(i => i !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Название расы обязательно');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/races', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description || null,
          effect_ids: effectIds,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Ошибка создания' }));
        throw new Error(errData.error || 'Ошибка создания');
      }
      await fetchRaces();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getEffectById = (id: number) => passiveEffects.find(e => e.id === id);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 md:p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800">📦 Создание расы</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Название расы *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none"
                placeholder="Например: Эльфы, Дварфы, Орки"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-400 focus:outline-none"
                placeholder="Краткое описание расы, её особенности..."
                disabled={loading}
              />
            </div>

            <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-lg">✨</span> Пассивные эффекты расы (действуют постоянно)
              </h3>
              <SelectedEffectsList
                effects={effectIds.map(id => getEffectById(id)).filter((e): e is EffectType => !!e)}
                onRemove={handleRemoveEffect}
                emptyText="Нет добавленных пассивных эффектов"
              />
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="🔍 Поиск по названию или тегам..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm"
                />
                <div className="flex gap-2">
                  <select
                    value={selectedEffectId}
                    onChange={(e) => setSelectedEffectId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm"
                    size={Math.min(5, availableEffects.length + 1)}
                  >
                    <option value="">-- Выберите пассивный эффект --</option>
                    {availableEffects.map(effect => (
                      <option key={effect.id} value={effect.id}>
                        {effect.name} {effect.modifier !== 0 && (effect.modifier > 0 ? `+${effect.modifier}` : effect.modifier)}
                        {effect.duration_turns && ` (${effect.duration_turns} ходов)`}
                        {effect.duration_days && ` (${effect.duration_days} дней)`}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddEffect}
                    disabled={!selectedEffectId}
                    className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition disabled:opacity-50"
                  >
                    + Добавить
                  </button>
                </div>
                {availableEffects.length === 0 && searchTerm && (
                  <p className="text-xs text-gray-500">Ничего не найдено</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50"
                disabled={loading}
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Создание...' : 'Создать расу'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
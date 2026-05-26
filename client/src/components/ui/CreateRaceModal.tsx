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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="modal-content w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold modal-title">📦 Создание расы</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="form-label block mb-2">Название расы *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input w-full"
                placeholder="Например: Эльфы, Дварфы, Орки"
                disabled={loading}
              />
            </div>

            <div>
              <label className="form-label block mb-2">Описание</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-textarea w-full resize-none"
                placeholder="Краткое описание расы, её особенности..."
                disabled={loading}
              />
            </div>

            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <span>✨</span> Пассивные эффекты расы (действуют постоянно)
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
                  className="form-input w-full text-sm"
                />
                <div className="flex gap-2">
                  <select
                    value={selectedEffectId}
                    onChange={(e) => setSelectedEffectId(e.target.value)}
                    className="form-select flex-1 text-sm"
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
                    className="btn-primary disabled:opacity-50"
                  >
                    + Добавить
                  </button>
                </div>
                {availableEffects.length === 0 && searchTerm && (
                  <p className="text-xs text-gray-400">Ничего не найдено</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
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
                {loading ? 'Создание...' : 'Создать расу'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
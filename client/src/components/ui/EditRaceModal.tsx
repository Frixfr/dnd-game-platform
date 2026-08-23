// client/src/components/ui/EditRaceModal.tsx
import { useState, useEffect, useMemo } from 'react';
import type { RaceType, EffectType } from '../../types';
import { useEffectStore } from '../../stores/effectStore';
import { SelectedEffectsList } from './SelectedEffectsList';
import { useNotification } from '../../hooks/useNotification';
import { useConfirm } from '../../hooks/useConfirm';

interface EditRaceModalProps {
  race: RaceType | null;
  onClose: () => void;
  onRaceSaved: () => void;
}

export const EditRaceModal = ({ race, onClose, onRaceSaved }: EditRaceModalProps) => {
  const { confirm, ConfirmModalComponent } = useConfirm();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    effect_ids: [] as number[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEffectId, setSelectedEffectId] = useState<string>('');
  const { fetchAllEffects, effects } = useEffectStore();
  const [effectsLoaded, setEffectsLoaded] = useState(false);
  const { showError } = useNotification();

  useEffect(() => {
    const load = async () => {
      await fetchAllEffects();
      setEffectsLoaded(true);
    };
    load();
  }, [fetchAllEffects]);

  useEffect(() => {
    if (!race) return;
    const loadRace = async () => {
      try {
        const res = await fetch(`/api/races/${race.id}`);
        if (res.ok) {
          const data = await res.json();
          setFormData({
            name: data.race.name || '',
            description: data.race.description || '',
            effect_ids: data.race.effects?.map((e: EffectType) => e.id) || [],
          });
        }
      } catch {
        setError('Не удалось загрузить расу');
      }
    };
    loadRace();
  }, [race]);

  const isPassiveEffect = (effect: EffectType) => !!effect.is_permanent;

  const passiveEffects = useMemo(() => {
    return effects.filter(isPassiveEffect);
  }, [effects]);

  const availableEffects = useMemo(() => {
    const notSelected = passiveEffects.filter(e => !formData.effect_ids.includes(e.id));
    if (!searchTerm.trim()) return notSelected;
    const lower = searchTerm.toLowerCase();
    return notSelected.filter(e => 
      e.name.toLowerCase().includes(lower) ||
      e.tags.some(tag => tag.toLowerCase().includes(lower))
    );
  }, [passiveEffects, formData.effect_ids, searchTerm]);

  const handleAddEffect = () => {
    const id = Number(selectedEffectId);
    if (!id || isNaN(id)) return;
    if (formData.effect_ids.includes(id)) {
      setError('Этот эффект уже добавлен');
      return;
    }
    setFormData(prev => ({ ...prev, effect_ids: [...prev.effect_ids, id] }));
    setSelectedEffectId('');
    setSearchTerm('');
  };

  const handleRemoveEffect = (id: number) => {
    setFormData(prev => ({ ...prev, effect_ids: prev.effect_ids.filter(i => i !== id) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Название расы обязательно');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = `/api/races/${race!.id}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description || null,
          effect_ids: formData.effect_ids,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Ошибка сохранения');
      }
      onRaceSaved();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка сохранения';
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!race) return;
    confirm({
      message: `Удалить расу "${race.name}"?`,
      onConfirm: async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/races/${race.id}`, { method: 'DELETE' });
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Ошибка удаления');
          }
          onRaceSaved();
          onClose();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Ошибка удаления';
          showError(message);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const getEffectById = (id: number) => passiveEffects.find(e => e.id === id);

  if (!race) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="modal-content w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden bg-[#0A1F44] border border-[#F2E9E4]/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header px-6 py-4 flex justify-between items-center border-b border-[#F2E9E4]/20">
          <h2 className="text-2xl font-bold text-[#F2E9E4]">✏️ Редактирование расы</h2>
          <button onClick={onClose} className="text-[#F2E9E4]/60 hover:text-[#F2E9E4] text-2xl leading-none">
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl border border-[#FF0026]/30 bg-[#FF0026]/10 text-[#FF0026] text-sm">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="form-label block mb-2 text-[#F2E9E4]">Название расы *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-input w-full bg-[#0A1F44] border border-[#F2E9E4]/30 text-[#F2E9E4] focus:ring-2 focus:ring-[#FF0026]"
                placeholder="Название расы"
                disabled={loading}
              />
            </div>

            <div>
              <label className="form-label block mb-2 text-[#F2E9E4]">Описание</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="form-textarea w-full resize-none bg-[#0A1F44] border border-[#F2E9E4]/30 text-[#F2E9E4] focus:ring-2 focus:ring-[#FF0026]"
                placeholder="Описание расы..."
                disabled={loading}
              />
            </div>

            <div className="card p-5 space-y-4 bg-[#0A1F44]/70 border border-[#F2E9E4]/20 rounded-xl">
              <h3 className="font-semibold text-lg text-[#F2E9E4] flex items-center gap-2">
                <span>✨</span> Пассивные эффекты расы
              </h3>
              {!effectsLoaded ? (
                <div className="text-center py-4 text-[#F2E9E4]/60">Загрузка эффектов...</div>
              ) : (
                <>
                  <SelectedEffectsList
                    effects={formData.effect_ids.map(id => getEffectById(id)).filter((e): e is EffectType => !!e)}
                    onRemove={handleRemoveEffect}
                    emptyText="Нет добавленных пассивных эффектов"
                  />
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="🔍 Поиск по названию или тегам..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="form-input w-full text-sm bg-[#0A1F44] border border-[#F2E9E4]/30 text-[#F2E9E4] focus:ring-2 focus:ring-[#FF0026]"
                    />
                    <div className="flex gap-2">
                      <select
                        value={selectedEffectId}
                        onChange={(e) => setSelectedEffectId(e.target.value)}
                        className="form-select flex-1 text-sm bg-[#0A1F44] border border-[#F2E9E4]/30 text-[#F2E9E4] focus:ring-2 focus:ring-[#FF0026]"
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
                        className="btn-primary disabled:opacity-50 bg-[#FF0026] hover:bg-[#FF0026]/90 text-white"
                      >
                        + Добавить
                      </button>
                    </div>
                    {availableEffects.length === 0 && searchTerm && (
                      <p className="text-xs text-[#F2E9E4]/60">Ничего не найдено</p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-[#F2E9E4]/20">
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-[#FF0026] text-white rounded-xl hover:bg-[#FF0026]/90 transition"
              >
                🗑️ Удалить расу
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary bg-[#0A1F44] text-[#F2E9E4] border border-[#F2E9E4]/30 hover:bg-[#0A1F44]/80"
                  disabled={loading}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary bg-[#FF0026] hover:bg-[#FF0026]/90 text-white"
                >
                  {loading ? 'Сохранение...' : 'Сохранить изменения'}
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
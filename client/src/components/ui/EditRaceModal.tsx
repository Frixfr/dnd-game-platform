// client/src/components/ui/EditRaceModal.tsx
import { useState, useEffect } from 'react';
import type { RaceType, EffectType } from '../../types';

interface EditRaceModalProps {
  race: RaceType | null;
  onClose: () => void;
  onRaceSaved: () => void;
}

export const EditRaceModal = ({ race, onClose, onRaceSaved }: EditRaceModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    effect_ids: [] as number[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [effects, setEffects] = useState<EffectType[]>([]);
  const [effectsLoading, setEffectsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadEffects = async () => {
      setEffectsLoading(true);
      try {
        const res = await fetch('/api/effects');
        if (res.ok) setEffects(await res.json());
      } catch {
        console.error('Failed to load effects');
      } finally {
        setEffectsLoading(false);
      }
    };
    loadEffects();
  }, []);

  useEffect(() => {
    if (race) {
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
    } else {
      setFormData({ name: '', description: '', effect_ids: [] });
    }
  }, [race]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Название расы обязательно');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = race ? `/api/races/${race.id}` : '/api/races';
      const method = race ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
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
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const filteredEffects = effects.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800">
            {race ? 'Редактирование расы' : 'Создание расы'}
          </h2>
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
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none"
                placeholder="Например: Эльфы, Дварфы, Орки"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-400 focus:outline-none"
                placeholder="Краткое описание расы, её особенности..."
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">✨ Эффекты расы</label>
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="🔍 Поиск эффектов..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                />
              </div>

              {effectsLoading ? (
                <div className="text-center py-4 text-gray-500">Загрузка эффектов...</div>
              ) : filteredEffects.length === 0 ? (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-xl">
                  {searchTerm ? 'Ничего не найдено' : 'Нет доступных эффектов. Сначала создайте эффекты.'}
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-100 rounded-xl p-2">
                  {filteredEffects.map((effect) => (
                    <label
                      key={effect.id}
                      className={`flex items-start p-3 rounded-xl cursor-pointer transition ${
                        formData.effect_ids.includes(effect.id)
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.effect_ids.includes(effect.id)}
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            effect_ids: prev.effect_ids.includes(effect.id)
                              ? prev.effect_ids.filter((id) => id !== effect.id)
                              : [...prev.effect_ids, effect.id],
                          }))
                        }
                        className="mt-1 mr-3 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{effect.name}</div>
                        <div className="text-sm text-gray-500">
                          {effect.attribute ? `${effect.attribute}: ${effect.modifier > 0 ? '+' : ''}${effect.modifier}` : 'Без атрибута'}
                          {effect.is_permanent ? ' (постоянный)' : effect.duration_turns ? ` (${effect.duration_turns} ходов)` : ''}
                        </div>
                        {effect.description && (
                          <div className="text-xs text-gray-400 mt-1">{effect.description}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <div className="mt-2 text-sm text-gray-500">
                Выбрано эффектов: {formData.effect_ids.length}
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
                {loading ? 'Сохранение...' : race ? 'Сохранить изменения' : 'Создать расу'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
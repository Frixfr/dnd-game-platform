// client/src/components/ui/EditRaceModal.tsx
import { useState, useEffect } from 'react';
import type { RaceType, EffectType } from '../../types';
import { useEffectStore } from '../../stores/effectStore';

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

  const { fetchEffects } = useEffectStore();

  // Загрузка эффектов
  useEffect(() => {
    const loadEffects = async () => {
      setEffectsLoading(true);
      try {
        const response = await fetch('/api/effects');
        if (response.ok) {
          const data = await response.json();
          setEffects(data);
        }
      } catch (err) {
        console.error('Ошибка загрузки эффектов:', err);
      } finally {
        setEffectsLoading(false);
      }
    };
    loadEffects();
  }, []);

  // Загрузка данных расы при редактировании
  useEffect(() => {
    if (race) {
      const loadRaceDetails = async () => {
        try {
          const response = await fetch(`/api/races/${race.id}`);
          if (response.ok) {
            const data = await response.json();
            const fullRace = data.race;
            setFormData({
              name: fullRace.name || '',
              description: fullRace.description || '',
              effect_ids: fullRace.effects?.map((e: EffectType) => e.id) || [],
            });
          }
        } catch (err) {
          console.error('Ошибка загрузки расы:', err);
          setError('Не удалось загрузить данные расы');
        }
      };
      loadRaceDetails();
    } else {
      setFormData({ name: '', description: '', effect_ids: [] });
    }
  }, [race]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEffectToggle = (effectId: number) => {
    setFormData(prev => ({
      ...prev,
      effect_ids: prev.effect_ids.includes(effectId)
        ? prev.effect_ids.filter(id => id !== effectId)
        : [...prev.effect_ids, effectId],
    }));
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
      const url = race ? `/api/races/${race.id}` : '/api/races';
      const method = race ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description || null,
          effect_ids: formData.effect_ids,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Ошибка сохранения расы');
      }

      onRaceSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredEffects = effects.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {race ? 'Редактирование расы' : 'Создание расы'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
              disabled={loading}
            >
              &times;
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название расы *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                maxLength={50}
                disabled={loading}
                placeholder="Например: Эльфы, Дварфы, Орки"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                placeholder="Краткое описание расы, её особенности..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Эффекты расы (баффы/дебаффы)
              </label>
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="🔍 Поиск эффектов..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>

              {effectsLoading ? (
                <div className="text-center py-4 text-gray-500">Загрузка эффектов...</div>
              ) : filteredEffects.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  {searchTerm ? 'Ничего не найдено' : 'Нет доступных эффектов. Сначала создайте эффекты на странице "Эффекты".'}
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded p-2">
                  {filteredEffects.map(effect => (
                    <label
                      key={effect.id}
                      className={`flex items-start p-2 rounded cursor-pointer transition ${
                        formData.effect_ids.includes(effect.id)
                          ? 'bg-blue-50 border-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.effect_ids.includes(effect.id)}
                        onChange={() => handleEffectToggle(effect.id)}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{effect.name}</div>
                        <div className="text-sm text-gray-600">
                          {effect.attribute ? `${effect.attribute}: ${effect.modifier > 0 ? '+' : ''}${effect.modifier}` : 'Без атрибута'}
                          {effect.is_permanent ? ' (постоянный)' : effect.duration_turns ? ` (${effect.duration_turns} ходов)` : ''}
                        </div>
                        {effect.description && (
                          <div className="text-xs text-gray-500 mt-1">{effect.description}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <div className="mt-2 text-xs text-gray-500">
                Выбрано эффектов: {formData.effect_ids.length}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                disabled={loading}
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Сохранение...' : (race ? 'Сохранить изменения' : 'Создать расу')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
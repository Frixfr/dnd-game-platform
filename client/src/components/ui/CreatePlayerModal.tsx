// client/src/components/ui/CreatePlayerModal.tsx
import { useState } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { useErrorHandler } from '../../hooks/useErrorHandler';

const initialStats = {
  strength: 0,
  agility: 0,
  intelligence: 0,
  physique: 0,
  wisdom: 0,
  charisma: 0,
};

export const CreatePlayerModal = ({ onClose }: { onClose: () => void }) => {
  const [formData, setFormData] = useState({
    name: '',
    gender: 'male',
    max_health: 60,
    armor: 10,
    history: '',
    ...initialStats,
  });
  const { fetchPlayers } = usePlayerStore();
  const { showError } = useErrorHandler();

  const handleStatChange = (stat: keyof typeof initialStats, value: number) => {
    setFormData(prev => ({ ...prev, [stat]: Math.min(10, Math.max(-10, value)) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError('Имя обязательно');
      return;
    }
    if (formData.max_health <= 0 || formData.armor < 0) {
      showError('Здоровье и броня должны быть положительными');
      return;
    }

    try {
      const response = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          health: formData.max_health,
          in_battle: false,
          is_online: false,
          is_card_shown: true,
        }),
      });
      if (!response.ok) throw new Error('Ошибка сервера');
      await fetchPlayers();
      onClose();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">✨ Создание игрока</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* Имя и пол */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Имя *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value.slice(0, 30) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none"
                placeholder="Арагорн"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Пол</label>
              <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="male"
                    checked={formData.gender === 'male'}
                    onChange={() => setFormData({ ...formData, gender: 'male' })}
                    className="w-4 h-4"
                  />
                  <span>Мужской</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="female"
                    checked={formData.gender === 'female'}
                    onChange={() => setFormData({ ...formData, gender: 'female' })}
                    className="w-4 h-4"
                  />
                  <span>Женский</span>
                </label>
              </div>
            </div>
          </div>

          {/* Здоровье и броня */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">❤️ Макс. здоровье</label>
              <input
                type="number"
                min="1"
                max="500"
                value={formData.max_health}
                onChange={e => setFormData({ ...formData, max_health: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">🛡️ Класс брони</label>
              <input
                type="number"
                min="0"
                max="30"
                value={formData.armor}
                onChange={e => setFormData({ ...formData, armor: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl"
              />
            </div>
          </div>

          {/* Характеристики со слайдерами */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">📊 Характеристики (от -10 до 10)</label>
            <div className="space-y-3">
              {(['strength', 'agility', 'intelligence', 'physique', 'wisdom', 'charisma'] as const).map(stat => {
                const labels: Record<string, string> = {
                  strength: 'Сила', agility: 'Ловкость', intelligence: 'Интеллект',
                  physique: 'Телосложение', wisdom: 'Мудрость', charisma: 'Харизма',
                };
                return (
                  <div key={stat}>
                    <div className="flex justify-between text-sm">
                      <span>{labels[stat]}</span>
                      <span className="font-mono font-bold">{formData[stat]}</span>
                    </div>
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      step="1"
                      value={formData[stat]}
                      onChange={e => handleStatChange(stat, parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* История */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">📜 История персонажа</label>
            <textarea
              rows={3}
              value={formData.history}
              onChange={e => setFormData({ ...formData, history: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl resize-none"
              placeholder="Расскажите о прошлом героя..."
            />
          </div>

          {/* Кнопки */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50">
              Отмена
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition">
              Создать игрока
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
// client/src/components/ui/EditPlayerModal.tsx
import { useState, useEffect } from 'react';
import type { PlayerType } from '../../types';
import { usePlayerStore } from '../../stores/playerStore';

interface EditPlayerModalProps {
  player: PlayerType;
  onClose: () => void;
  onPlayerUpdated: (updatedPlayer: PlayerType) => void;
}

export const EditPlayerModal = ({ player, onClose, onPlayerUpdated }: EditPlayerModalProps) => {
  const [formData, setFormData] = useState<PlayerType>(player);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Обновляем форму при изменении игрока
  useEffect(() => {
    setFormData(player);
  }, [player]);

  const { fetchPlayers } = usePlayerStore();
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Обработка числовых полей
    const numericFields = [
      'health', 'max_health', 'armor', 'strength',
      'agility', 'intelligence', 'physique',
      'wisdom', 'charisma'
    ];
    
    if (numericFields.includes(name)) {
      setFormData({
        ...formData,
        [name]: value === '' ? 0 : parseInt(value, 10) || 0
      });
    } else if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({
        ...formData,
        [name]: checked
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Валидация на клиенте
    if (!formData.name.trim()) {
      setError('Имя игрока обязательно');
      setLoading(false);
      return;
    }
    
    if (formData.name.length > 50) {
      setError('Имя не должно превышать 50 символов');
      setLoading(false);
      return;
    }
    
    if (formData.health > formData.max_health) {
      setError('Текущее здоровье не может превышать максимальное');
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:5000/api/players/${player.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка обновления игрока');
      }
      
      const result = await response.json();

      await fetchPlayers();
      
      if (result.success) {
        onPlayerUpdated(result.player);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при обновлении игрока');
      console.error('Ошибка обновления:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Редактирование игрока</h2>
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
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Основная информация */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Имя игрока *
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
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Пол
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="male">Мужской</option>
                  <option value="female">Женский</option>
                </select>
              </div>
            </div>
            
            {/* Здоровье */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Текущее здоровье
                </label>
                <input
                  type="number"
                  name="health"
                  value={formData.health}
                  onChange={handleInputChange}
                  min="0"
                  max={formData.max_health}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Максимальное здоровье
                </label>
                <input
                  type="number"
                  name="max_health"
                  value={formData.max_health}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
            </div>
            
            {/* Основные характеристики */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Броня
                </label>
                <input
                  type="number"
                  name="armor"
                  value={formData.armor}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Сила
                </label>
                <input
                  type="number"
                  name="strength"
                  value={formData.strength}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ловкость
                </label>
                <input
                  type="number"
                  name="agility"
                  value={formData.agility}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Интеллект
                </label>
                <input
                  type="number"
                  name="intelligence"
                  value={formData.intelligence}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Телосложение
                </label>
                <input
                  type="number"
                  name="physique"
                  value={formData.physique}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Мудрость
                </label>
                <input
                  type="number"
                  name="wisdom"
                  value={formData.wisdom}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Харизма
                </label>
                <input
                  type="number"
                  name="charisma"
                  value={formData.charisma}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
            </div>
            
            {/* История и статусы */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                История персонажа
              </label>
              <textarea
                name="history"
                value={formData.history || ''}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            
            {/* Статусные переключатели */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="in_battle"
                  name="in_battle"
                  checked={formData.in_battle}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={loading}
                />
                <label htmlFor="in_battle" className="ml-2 block text-sm text-gray-700">
                  В бою
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_online"
                  name="is_online"
                  checked={formData.is_online}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={loading}
                />
                <label htmlFor="is_online" className="ml-2 block text-sm text-gray-700">
                  В сети
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_card_shown"
                  name="is_card_shown"
                  checked={formData.is_card_shown}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={loading}
                />
                <label htmlFor="is_card_shown" className="ml-2 block text-sm text-gray-700">
                  Показывать карточку
                </label>
              </div>
            </div>
            
            {/* Кнопки действий */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled={loading}
              >
                Отмена
              </button>
              
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
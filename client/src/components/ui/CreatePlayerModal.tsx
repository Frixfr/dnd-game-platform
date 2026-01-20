// client/src/components/ui/CreatePlayerModal.tsx
import { useState } from 'react';
import type { PlayerType } from '../../types';
//import { usePlayerStore } from '../../store/playerStore';

// Форма создания игрока с валидацией
export const CreatePlayerModal = ({ onClose }: { onClose: () => void }) => {
  const [formData, setFormData] = useState<Omit<PlayerType, 'id' | 'created_at'>>({
    name: '',
    gender: 'male',
    health: 60,
    max_health: 60,
    armor: 10,
    strength: 0,
    agility: 0,
    intelligence: 0,
    physique: 0,
    wisdom: 0,
    charisma: 0,
    history: 'no history',
    in_battle: false,
    is_online: false,
    is_card_shown: true
  });
  
  const [error, setError] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Базовая валидация
    if (!formData.name.trim()) {
      setError('Имя обязательно');
      return;
    }
    if (formData.health <= 0 || formData.armor < 0) {
      setError('Некорректные значения здоровья/брони');
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error('Ошибка сервера');
      
      // Сервер сам обновит состояние через сокеты
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Создать игрока</h2>
          
          {error && <div className="text-red-500 mb-4 text-sm">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-4">                    
            {/* Основные поля */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Имя</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2 border rounded"
                  maxLength={30}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Пол</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={formData.gender === 'male'}
                      onChange={(e) => setFormData({...formData, gender: e.target.value})}
                      className="mr-2"
                    />
                    Мужской
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={formData.gender === 'female'}
                      onChange={(e) => setFormData({...formData, gender: e.target.value})}
                      className="mr-2"
                    />
                    Женский
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Здоровье</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.max_health}
                  onChange={(e) => setFormData({...formData, max_health: Math.max(1, parseInt(e.target.value) || 1)})}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Броня</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={formData.armor}
                  onChange={(e) => setFormData({...formData, armor: Math.max(0, parseInt(e.target.value) || 0)})}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            
            {/* Характеристики */}
            <div className="space-y-2">
              <h3 className="font-medium">Характеристики</h3>
              {(['strength', 'agility', 'intelligence', 'physique', 'wisdom', 'charisma'] as const).map(stat => (
                <div key={stat} className="flex items-center">
                  <label className="w-24 capitalize text-sm">{stat}</label>
                  <input
                    type="number"
                    min="-10"
                    max="10"
                    value={formData[stat]}
                    onChange={(e) => setFormData({
                      ...formData,
                      [stat]: Math.max(-10, parseInt(e.target.value) || 0)
                    })}
                    className="w-20 p-1 border rounded mr-2"
                  />
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500" 
                      style={{ width: `${formData[stat]}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Создать
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
// client/src/pages/MasterDashboardPage.tsx
import { useState, useEffect } from 'react';
import { PlayerCard } from '../components/ui/PlayerCard';
import { CreatePlayerModal } from '../components/ui/CreatePlayerModal';
import { usePlayerStore } from '../stores/playerStore';
import type { PlayerType } from '../types';

export const MasterDashboardPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [players, setPlayers] = useState<PlayerType[]>([]);
  const [loading, setLoading] = useState(true);
  const { initializeSocket, socket } = usePlayerStore();
  
  // Инициализация сокетов при монтировании
  useEffect(() => {
    initializeSocket();
  }, []);
  
  // Загрузка начальных данных
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/players');
        if (!response.ok) throw new Error('Ошибка загрузки');
        const data = await response.json();
        setPlayers(data);
      } catch (error) {
        console.error('Ошибка:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Подписка на события сокетов (Zustand уже обрабатывает это через стор)
    return () => {
      if (socket) socket.off('playerCreated');
    };
  }, [socket]);
  
  // Синхронизация Zustand стора с локальным состоянием
  const { players: zustandPlayers } = usePlayerStore();
  useEffect(() => {
    setPlayers(zustandPlayers);
  }, [zustandPlayers]);
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Панель мастера</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          + Создать игрока
        </button>
      </div>
      
      {loading ? (
        <div className="text-center py-12">Загрузка...</div>
      ) : players.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Нет созданных игроков. Нажмите кнопку выше для создания первого.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {players.map(player => (
            <PlayerCard 
              key={player.id} 
              player={player} 
              onClick={() => alert(`Редактирование игрока ${player.name} (ID: ${player.id})`)} 
            />
          ))}
        </div>
      )}
      
      {isModalOpen && <CreatePlayerModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};

export default MasterDashboardPage;
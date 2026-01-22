// client/src/pages/MasterDashboardPage.tsx
import { useState, useEffect } from 'react';
import { PlayerCard } from '../components/ui/PlayerCard';
import { CreatePlayerModal } from '../components/ui/CreatePlayerModal';
import { EditPlayerModal } from '../components/ui/EditPlayerModal';
import { usePlayerStore } from '../stores/playerStore';
import type { PlayerType } from '../types';

export const MasterDashboardPage = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerType | null>(null);
  const [players, setPlayers] = useState<PlayerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFullPlayer, setLoadingFullPlayer] = useState(false);
  const { initializeSocket, socket, updatePlayer, deletePlayer } = usePlayerStore();

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
    
    return () => {
      if (socket) {
        socket.off('playerCreated');
        socket.off('playerUpdated');
        socket.off('playerDeleted');
      }
    };
  }, [socket]);
  
  // Синхронизация Zustand стора с локальным состоянием
  const { players: zustandPlayers } = usePlayerStore();
  useEffect(() => {
    setPlayers(zustandPlayers);
  }, [zustandPlayers]);

  // Обработчик клика по карточке игрока - теперь загружаем полные данные
  const handlePlayerClick = async (player: PlayerType) => {
    setLoadingFullPlayer(true);
    try {
      // Загружаем полные данные игрока
      const response = await fetch(`http://localhost:5000/api/players/${player.id}/full`);
      if (!response.ok) throw new Error('Ошибка загрузки полных данных игрока');
      const fullPlayer = await response.json();
      setSelectedPlayer(fullPlayer);
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Ошибка загрузки полных данных:', error);
      // Если не удалось загрузить полные данные, открываем с базовыми
      setSelectedPlayer(player);
      setIsEditModalOpen(true);
    } finally {
      setLoadingFullPlayer(false);
    }
  };
  
  // Обработчик обновления игрока
  const handlePlayerUpdated = (updatedPlayer: PlayerType) => {
    updatePlayer(updatedPlayer);
    setIsEditModalOpen(false);
    setSelectedPlayer(null);
  };

  // Обработчик удаления игрока
  const handleDeletePlayer = async () => {
    if (!selectedPlayer || !confirm(`Вы уверены, что хотите удалить игрока "${selectedPlayer.name}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:5000/api/players/${selectedPlayer.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Ошибка удаления игрока');
      }
      
      const result = await response.json();
      
      if (result.success) {
        deletePlayer(selectedPlayer.id);
        setIsEditModalOpen(false);
        setSelectedPlayer(null);
        alert(`Игрок "${selectedPlayer.name}" удален`);
      }
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Не удалось удалить игрока');
    }
  };
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Панель игроков</h1>
          <p className="text-gray-600 mt-1">
            Всего игроков: <span className="font-semibold">{players.length}</span>
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          + Создать игрока
        </button>
      </div>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Загрузка игроков...</p>
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
          <p className="text-lg mb-2">Нет созданных игроков</p>
          <p className="mb-4">Нажмите кнопку выше для создания первого игрока</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {players.map(player => (
            <PlayerCard 
              key={player.id} 
              player={player} 
              onClick={() => handlePlayerClick(player)}
              disabled={loadingFullPlayer}
            />
          ))}
        </div>
      )}
      
      {/* Индикатор загрузки полных данных */}
      {loadingFullPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-700">Загрузка данных игрока...</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Модальное окно создания игрока */}
      {isCreateModalOpen && (
        <CreatePlayerModal onClose={() => setIsCreateModalOpen(false)} />
      )}
      
      {/* Модальное окно редактирования игрока */}
      {isEditModalOpen && selectedPlayer && (
        <EditPlayerModal
          player={selectedPlayer}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedPlayer(null);
          }}
          onPlayerUpdated={handlePlayerUpdated}
        />
      )}
    </div>
  );
};

export default MasterDashboardPage;
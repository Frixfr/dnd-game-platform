// Файл: client/src/pages/MasterDashboardPage.tsx

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
  const [loading, setLoading] = useState(true);

  const { players, updatePlayer, socket, initializeSocket } = usePlayerStore();

  // Инициализация сокетов при монтировании
  useEffect(() => {
    initializeSocket();
  }, [initializeSocket]);

  // Загрузка начальных данных через стор (используется эндпоинт ?full=true)
  useEffect(() => {
    const loadPlayers = async () => {
      setLoading(true);
      // fetchPlayers уже вызывается при connect сокета, но для уверенности делаем вызов,
      // если сокет ещё не подключён или fetch не сработал.
      const { players: currentPlayers, fetchPlayers } = usePlayerStore.getState();
      if (currentPlayers.length === 0) {
        await fetchPlayers();
      }
      setLoading(false);
    };
    loadPlayers();
  }, []);

  // Очистка сокет-событий при размонтировании
  useEffect(() => {
    return () => {
      if (socket) {
        socket.off('player:created');
        socket.off('player:updated');
        socket.off('player:deleted');
      }
    };
  }, [socket]);

  // Обработчик клика по карточке игрока – теперь у нас уже есть полные данные,
  // не нужно делать дополнительный запрос /details
  const handlePlayerClick = (player: PlayerType) => {
    setSelectedPlayer(player);
    setIsEditModalOpen(true);
  };

  const handlePlayerUpdated = (updatedPlayer: PlayerType) => {
    updatePlayer(updatedPlayer);
    setIsEditModalOpen(false);
    setSelectedPlayer(null);
  };

  const handleDeletePlayer = async (player: PlayerType) => {
    try {
      const response = await fetch(`/api/players/${player.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Ошибка удаления');
      // стор обновится через сокет (player:deleted)
    } catch (error) {
      console.error(error);
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
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              onClick={() => handlePlayerClick(player)}
              onDelete={() => handleDeletePlayer(player)}
            />
          ))}
        </div>
      )}

      {/* Модальное окно создания игрока */}
      {isCreateModalOpen && <CreatePlayerModal onClose={() => setIsCreateModalOpen(false)} />}

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
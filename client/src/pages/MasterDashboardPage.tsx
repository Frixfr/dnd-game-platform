// client/src/pages/MasterDashboardPage.tsx

import { useState, useEffect } from 'react';
import { PlayerCard } from '../components/ui/PlayerCard';
import { CreatePlayerModal } from '../components/ui/CreatePlayerModal';
import { EditPlayerModal } from '../components/ui/EditPlayerModal';
import { Pagination } from '../components/ui/Pagination';
import { usePlayerStore } from '../stores/playerStore';
import type { PlayerType } from '../types';
import ConfirmModal from '../components/ui/ConfirmModal';

export const MasterDashboardPage = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<PlayerType | null>(null);

  const {
    players,
    playersTotal,
    currentPage,
    limit,
    fetchPlayers,
    initializeSocket,
    socket,
  } = usePlayerStore();

  useEffect(() => {
    initializeSocket();
  }, [initializeSocket]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchPlayers(currentPage, limit);
      setLoading(false);
    };
    load();
  }, [currentPage, limit, fetchPlayers]);

  useEffect(() => {
    return () => {
      if (socket) {
        socket.off('player:created');
        socket.off('player:updated');
        socket.off('player:deleted');
      }
    };
  }, [socket]);

  const handlePlayerClick = (player: PlayerType) => {
    setSelectedPlayer(player);
    setIsEditModalOpen(true);
  };

  const handlePlayerUpdated = () => {
    setIsEditModalOpen(false);
    setSelectedPlayer(null);
    fetchPlayers(currentPage, limit);
  };

  const handleDeletePlayer = async (player: PlayerType) => {
    setPlayerToDelete(player);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!playerToDelete) return;
    try {
      const response = await fetch(`/api/players/${playerToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Ошибка удаления');
    } catch (error) {
      console.error(error);
      alert('Не удалось удалить игрока');
    } finally {
      setShowConfirmModal(false);
      setPlayerToDelete(null);
    }
  };

  const totalPages = Math.ceil(playersTotal / limit);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Панель игроков</h1>
          <p className="text-gray-600 mt-1">
            Всего игроков: <span className="font-semibold">{playersTotal}</span>
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
        <>
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
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => fetchPlayers(page, limit)}
          />
        </>
      )}

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

      <ConfirmModal
        isOpen={showConfirmModal}
        message={`Удалить игрока "${playerToDelete?.name}"?`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowConfirmModal(false);
          setPlayerToDelete(null);
        }}
      />
    </div>
  );
};

export default MasterDashboardPage;
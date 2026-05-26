// client/src/pages/MasterDashboardPage.tsx - Обновленный дизайн

import { useState, useEffect } from 'react';
import { PlayerCard } from '../components/ui/PlayerCard';
import { CreatePlayerModal } from '../components/ui/CreatePlayerModal';
import { EditPlayerModal } from '../components/ui/EditPlayerModal';
import { Pagination } from '../components/ui/Pagination';
import { usePlayerStore } from '../stores/playerStore';
import type { PlayerType } from '../types';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { Users, Plus } from 'lucide-react';

export const MasterDashboardPage = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<PlayerType | null>(null);
  const { showError } = useErrorHandler();

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
      await fetchPlayers(currentPage, limit);
    } catch (error) {
      console.error(error);
      showError('Не удалось удалить игрока');
    } finally {
      setShowConfirmModal(false);
      setPlayerToDelete(null);
    }
  };

  const totalPages = Math.ceil(playersTotal / limit);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto animate-fade-in">
      {/* Заголовок страницы */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-[var(--border-color)]">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Users size={28} className="text-amber-400" />
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
              Панель игроков
            </h1>
          </div>
          <p className="text-[var(--text-secondary)]">
            Всего игроков: <span className="font-semibold text-amber-400">{playersTotal}</span>
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-300 hover:-translate-y-0.5"
        >
          <Plus size={20} />
          <span>Создать игрока</span>
        </button>
      </div>

      {/* Контент */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
            <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-400 rounded-full animate-spin relative z-10" />
          </div>
          <p className="mt-4 text-[var(--text-secondary)]">Загрузка игроков...</p>
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-20 bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--border-color)]">
          <Users size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
          <p className="text-lg text-[var(--text-secondary)] mb-2">Нет созданных игроков</p>
          <p className="text-[var(--text-muted)] mb-6">Нажмите кнопку выше для создания первого игрока</p>
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
          <div className="mt-8">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => fetchPlayers(page, limit)}
            />
          </div>
        </>
      )}

      {/* Модальные окна */}
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

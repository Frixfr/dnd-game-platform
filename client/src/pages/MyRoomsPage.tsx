// client/src/pages/MyRoomsPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomStore } from '../stores/roomStore';
import { CreateRoomModal } from '../components/ui/CreateRoomModal';
import { EnterRoomModal } from '../components/ui/EnterRoomModal';
import { SetRoomPasswordModal } from '../components/ui/SetRoomPasswordModal';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { Plus, DoorOpen, Lock, Trash2, Users, CheckCircle } from 'lucide-react';

export const MyRoomsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    rooms,
    isLoading,
    fetchRooms,
    deleteRoom,
    setActiveRoom,
    logout,
    currentRoom,
    token,
  } = useRoomStore();
  const { showError } = useErrorHandler();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEnterModalOpen, setIsEnterModalOpen] = useState(false);
  const [isSetPasswordModalOpen, setIsSetPasswordModalOpen] = useState(false);
  const [roomToEnter, setRoomToEnter] = useState<{ id: number; name: string } | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<number | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    if (currentRoom) {
      navigate('/master');
      return;
    }
    fetchRooms().catch(() => showError('Не удалось загрузить комнаты'));
  }, [token, currentRoom, navigate, fetchRooms, showError]);

  const handleEnterRoom = (id: number, name: string, hasPassword?: boolean) => {
    if (!hasPassword) {
      // Если пароля нет, входим сразу
      enterRoom(id, undefined).catch(() => showError('Не удалось войти в комнату'));
    } else {
      // Если пароль есть, показываем модальное окно
      setRoomToEnter({ id, name });
      setIsEnterModalOpen(true);
    }
  };

  const handleSetPassword = () => {
    setIsEnterModalOpen(false);
    setIsSetPasswordModalOpen(true);
  };

  const handleDeleteRoom = (id: number) => {
    setRoomToDelete(id);
    setShowConfirmDelete(true);
  };

  const confirmDelete = async () => {
    if (!roomToDelete) return;
    try {
      await deleteRoom(roomToDelete);
    } catch {
      showError('Не удалось удалить комнату');
    } finally {
      setShowConfirmDelete(false);
      setRoomToDelete(null);
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      await setActiveRoom(id);
      await fetchRooms();
    } catch {
      showError('Не удалось изменить статус активности');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1F44] via-[#0d2552] to-[#0A1F44] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
              <Users className="text-accent-red" size={32} />
              Мои комнаты
            </h1>
            <p className="text-text-secondary mt-1">
              Управляйте игровыми комнатами. Войдите в комнату, чтобы начать сессию.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-color rounded-xl transition-colors"
            >
              Выйти
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 btn-primary"
            >
              <Plus size={20} />
              Создать комнату
            </button>
          </div>
        </div>

        {/* Список комнат */}
        {isLoading && rooms.length === 0 ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-accent-red/30 border-t-accent-red rounded-full animate-spin" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20 bg-bg-secondary rounded-2xl border border-border-color">
            <Users size={48} className="mx-auto text-text-muted mb-4" />
            <p className="text-lg text-text-secondary mb-2">У вас нет комнат</p>
            <p className="text-text-muted">Создайте первую комнату, чтобы начать игру</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="bg-card rounded-2xl border border-border-color hover:border-accent-red/30 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 p-5 flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-text-primary">{room.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {room.is_active_for_players ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                          <CheckCircle size={12} />
                          Активна для игроков
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full border border-border-color">
                          Неактивна
                        </span>
                      )}
                      {room.has_password && (
                        <span className="inline-flex items-center gap-1 text-xs text-text-secondary bg-bg-tertiary px-2 py-0.5 rounded-full border border-border-color">
                          <Lock size={12} />
                          Защищена
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(room.id)}
                      className="w-8 h-8 flex items-center justify-center text-xs text-text-secondary hover:text-accent-red hover:bg-accent-red/10 rounded-full transition-colors"
                      title={room.is_active_for_players ? 'Деактивировать' : 'Активировать для игроков'}
                    >
                      {room.is_active_for_players ? '🔴' : '🟢'}
                    </button>
                    <button
                      onClick={() => handleDeleteRoom(room.id)}
                      className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-accent-red hover:bg-accent-red/10 rounded-full transition-colors"
                      title="Удалить комнату"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-border-color flex gap-2">
                  <button
                    onClick={() => handleEnterRoom(room.id, room.name, room.has_password)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 btn-primary text-sm"
                  >
                    <DoorOpen size={16} />
                    Войти
                  </button>
                  {!room.has_password && (
                    <button
                      onClick={() => {
                        setRoomToEnter({ id: room.id, name: room.name });
                        setIsSetPasswordModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-2 btn-secondary text-sm"
                      title="Задать пароль"
                    >
                      <Lock size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модалки */}
      {isCreateModalOpen && (
        <CreateRoomModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            fetchRooms();
          }}
        />
      )}

      {isEnterModalOpen && roomToEnter && (
        <EnterRoomModal
          roomId={roomToEnter.id}
          roomName={roomToEnter.name}
          hasPassword={rooms.find(r => r.id === roomToEnter?.id)?.has_password}
          onClose={() => {
            setIsEnterModalOpen(false);
            setRoomToEnter(null);
          }}
          onSetPassword={handleSetPassword}
          onSuccess={() => {
            // После входа редирект произойдёт автоматически благодаря эффекту
          }}
        />
      )}

      {isSetPasswordModalOpen && roomToEnter && (
        <SetRoomPasswordModal
          roomId={roomToEnter.id}
          roomName={roomToEnter.name}
          onClose={() => {
            setIsSetPasswordModalOpen(false);
            setRoomToEnter(null);
          }}
          onSuccess={() => {
            // После установки пароля снова открываем модальное окно входа
            setIsSetPasswordModalOpen(false);
            setIsEnterModalOpen(true);
          }}
        />
      )}

      <ConfirmModal
        isOpen={showConfirmDelete}
        message="Вы уверены, что хотите удалить эту комнату? Все данные внутри комнаты (игроки, NPC, предметы и т.д.) будут безвозвратно удалены."
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowConfirmDelete(false);
          setRoomToDelete(null);
        }}
      />
    </div>
  );
};
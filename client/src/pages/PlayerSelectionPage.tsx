import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayerCard } from '../components/ui/PlayerCard';
import SetPasswordModal from '../components/ui/SetPasswordModal';
import { usePlayerSessionStore } from '../stores/playerSessionStore';
import type { PlayerType } from '../types';

export const PlayerSelectionPage = () => {
  const [players, setPlayers] = useState<PlayerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerType | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const navigate = useNavigate();
  const { setSelectedPlayer: setSessionPlayer } = usePlayerSessionStore();

  useEffect(() => {
    const fetchAvailablePlayers = async () => {
      try {
        const response = await fetch('/api/players?available_for_selection=true');
        if (!response.ok) throw new Error('Ошибка загрузки');
        const data = await response.json();
        setPlayers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    };
    fetchAvailablePlayers();
  }, []);

  const handleSelectPlayer = (player: PlayerType) => {
    // У игроков из этого списка гарантированно нет пароля (access_password === null)
    setSelectedPlayer(player);
    setShowPasswordModal(true);
  };

  const handleSetPassword = async (password: string) => {
    if (!selectedPlayer) return;
    const response = await fetch(`/api/players/${selectedPlayer.id}/set-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Ошибка установки пароля');
    }
    // После успешной установки пароля загружаем полные данные игрока
    const fullPlayer = data.player; // сервер вернул FullPlayerData
    setSessionPlayer(fullPlayer);
    navigate(`/player/${fullPlayer.id}`);
  };

  const handleCancelPassword = () => {
    setShowPasswordModal(false);
    setSelectedPlayer(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">Загрузка доступных персонажей...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center text-red-600">Ошибка: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Выберите своего героя</h1>
          <p className="text-slate-600">
            Кликните по карточке, затем задайте пароль для входа в будущем.
          </p>
        </div>

        {players.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow">
            <p className="text-lg text-gray-500">Нет доступных персонажей. Обратитесь к мастеру.</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Назад
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {players.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                onClick={() => handleSelectPlayer(player)}
              />
            ))}
          </div>
        )}
      </div>

      {showPasswordModal && selectedPlayer && (
        <SetPasswordModal
          playerName={selectedPlayer.name}
          onSetPassword={handleSetPassword}
          onClose={handleCancelPassword}
        />
      )}
    </div>
  );
};
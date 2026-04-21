// client/src/pages/PlayerCharacterSheetPage.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePlayerSessionStore } from '../stores/playerSessionStore';
import type { PlayerType } from '../types';

export const PlayerCharacterSheetPage = () => {
  const { playerId } = useParams();
  const { selectedPlayer, setSelectedPlayer } = usePlayerSessionStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFullPlayer = async () => {
      if (!playerId) return;
      try {
        const response = await fetch(`/api/players/${playerId}/details`);
        if (!response.ok) throw new Error('Ошибка загрузки');
        const fullPlayer = await response.json();
        setSelectedPlayer(fullPlayer);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка');
      } finally {
        setLoading(false);
      }
    };
    if (selectedPlayer && selectedPlayer.id === Number(playerId)) {
      setLoading(false);
    } else {
      loadFullPlayer();
    }
  }, [playerId, selectedPlayer, setSelectedPlayer]);

  if (loading) return <div className="text-center py-12">Загрузка...</div>;
  if (error) return <div className="text-center py-12 text-red-600">Ошибка: {error}</div>;
  if (!selectedPlayer) return <div className="text-center py-12">Персонаж не найден</div>;

  const player = selectedPlayer as PlayerType;

  // Простой рендер (можно скопировать из EditPlayerModal но без форм)
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-2xl font-bold mb-4">{player.name}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><strong>Пол:</strong> {player.gender === 'male' ? 'Мужской' : 'Женский'}</div>
          <div><strong>Раса:</strong> {player.race?.name || 'Нет'}</div>
          <div><strong>Здоровье:</strong> {player.health}/{player.max_health}</div>
          <div><strong>Класс брони:</strong> {player.armor}</div>
        </div>
        <div className="mt-4">
          <h3 className="font-semibold">Характеристики</h3>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {(['strength', 'agility', 'intelligence', 'physique', 'wisdom', 'charisma'] as const).map(stat => (
              <div key={stat} className="bg-gray-50 p-2 rounded">
                <span className="capitalize">{stat}</span>: {player[stat]}
                {player.final_stats && player.final_stats[stat] !== player[stat] && (
                  <span className="text-sm text-gray-500 ml-1">
                    (→ {player.final_stats[stat]})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        {player.history && (
          <div className="mt-4">
            <h3 className="font-semibold">История</h3>
            <p className="text-gray-700 mt-1">{player.history}</p>
          </div>
        )}
      </div>
    </div>
  );
};
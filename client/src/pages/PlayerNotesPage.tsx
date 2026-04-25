import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePlayerStore } from '../stores/playerStore';
import { useNotification } from '../hooks/useNotification';

export const PlayerNotesPage: React.FC = () => {
  const { playerId } = useParams<{ playerId: string }>();
  const { players, fetchAllPlayers, updatePlayerNotes } = usePlayerStore();
  const { showSuccess, showError } = useNotification();
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const player = players.find(p => p.id === Number(playerId));

  useEffect(() => {
    if (player) {
      setNotes(player.notes || '');
    } else if (playerId) {
      fetchAllPlayers().then(() => {
        const refreshed = usePlayerStore.getState().players.find(p => p.id === Number(playerId));
        if (refreshed) setNotes(refreshed.notes || '');
      });
    }
  }, [player, playerId, fetchAllPlayers]);

  const handleSave = async () => {
    if (!playerId) return;
    setIsSaving(true);
    try {
      await updatePlayerNotes(Number(playerId), notes);
      showSuccess('Заметки сохранены');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка сохранения';
      showError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!player) {
    return <div className="p-8 text-center">Загрузка...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📝 Мои заметки</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full h-96 p-3 border border-gray-300 rounded-lg resize-y"
          placeholder="Здесь вы можете записывать важную информацию: имена других игроков, квесты, заметки по сюжету и т.д."
        />
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
};
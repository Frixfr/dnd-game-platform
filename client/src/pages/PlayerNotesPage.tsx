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
    return <div className="p-8 text-center text-[#F2E9E4]">Загрузка...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-[#F2E9E4]">📝 Мои заметки</h1>
      <div className="bg-[#F2E9E4] rounded-lg border border-[#0A1F44] shadow p-6">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full h-96 p-3 bg-[#F2E9E4] border border-[#0A1F44]/30 rounded-lg resize-y text-[#0A1F44] placeholder:text-[#8b9bb4] focus:outline-none focus:ring-2 focus:ring-[#FF0026]/50"
          placeholder="Здесь вы можете записывать важную информацию: имена других игроков, квесты, заметки по сюжету и т.д."
        />
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary disabled:opacity-50"
          >
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
};
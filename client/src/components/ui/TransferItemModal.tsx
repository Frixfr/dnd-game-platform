import { useState, useEffect } from 'react';
import Modal from './Modal';
import { usePlayerStore } from '../../stores/playerStore';
import type { PlayerType } from '../../types';

interface TransferItemModalProps {
  onClose: () => void;
  currentPlayerId: number;
  itemName: string;
  onTransfer: (targetPlayerId: number) => Promise<void>;
}

export const TransferItemModal = ({ onClose, currentPlayerId, itemName, onTransfer }: TransferItemModalProps) => {
  const [players, setPlayers] = useState<PlayerType[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const { fetchAllPlayers } = usePlayerStore();

  useEffect(() => {
    fetchAllPlayers().then(all => {
      const online = all.filter(p => p.is_online === true && p.id !== currentPlayerId);
      setPlayers(online);
      setSelectedId(online[0]?.id || null);
    });
  }, [currentPlayerId, fetchAllPlayers]);

  const handleTransfer = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      await onTransfer(selectedId);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title={`Передать "${itemName}"`}>
      <div className="space-y-4">
        {players.length === 0 ? (
          <p className="text-sm text-gray-500">Нет онлайн-игроков для передачи</p>
        ) : (
          <select
            value={selectedId || ''}
            onChange={e => setSelectedId(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            {players.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">Отмена</button>
          <button
            onClick={handleTransfer}
            disabled={!selectedId || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Передача...' : 'Передать'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
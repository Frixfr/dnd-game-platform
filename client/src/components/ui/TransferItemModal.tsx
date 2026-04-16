import { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import { usePlayerStore } from '../../stores/playerStore';
import { socket } from '../../lib/socket';
import type { PlayerType } from '../../types';

interface TransferItemModalProps {
  onClose: () => void;
  currentPlayerId: number;
  itemName: string;
  currentQuantity: number;
  playerItemId: number;
  onTransfer: (targetPlayerId: number, quantity: number) => Promise<void>;
}

export const TransferItemModal = ({
  onClose,
  currentPlayerId,
  itemName,
  currentQuantity,
  onTransfer,
}: TransferItemModalProps) => {
  const [players, setPlayers] = useState<PlayerType[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const { fetchAllPlayers } = usePlayerStore();

  const loadOnlinePlayers = useCallback(async () => {
    const all = await fetchAllPlayers();
    const online = all.filter(p => p.is_online && p.id !== currentPlayerId);
    setPlayers(online);
    if (online.length > 0 && !selectedId) {
      setSelectedId(online[0].id);
    } else if (online.length === 0) {
      setSelectedId(null);
    }
  }, [fetchAllPlayers, currentPlayerId, selectedId]);

  useEffect(() => {
    loadOnlinePlayers();

    const handlePlayerUpdated = () => {
      loadOnlinePlayers();
    };
    socket.on('player:updated', handlePlayerUpdated);

    return () => {
      socket.off('player:updated', handlePlayerUpdated);
    };
  }, [loadOnlinePlayers]);

  const handleTransfer = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      await onTransfer(selectedId, quantity);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title={`Передать "${itemName}"`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Количество (доступно: {currentQuantity})
          </label>
          <input
            type="number"
            min={1}
            max={currentQuantity}
            value={quantity}
            onChange={e => setQuantity(Math.min(currentQuantity, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>

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
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">
            Отмена
          </button>
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
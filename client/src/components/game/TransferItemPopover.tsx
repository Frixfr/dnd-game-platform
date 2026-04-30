// client/src/components/game/TransferItemPopover.tsx
import React, { useState, useEffect } from "react";
import type { PlayerItemExtended, Player } from "../../types";
import { useNotification } from "../../hooks/useNotification";
import { X, Plus, Minus } from "lucide-react";

interface TransferItemPopoverProps {
  item: PlayerItemExtended | null;
  playerId: number;
  onClose: () => void;
  onTransfer: () => void;
}

const TransferItemPopover: React.FC<TransferItemPopoverProps> = ({ item, playerId, onClose, onTransfer }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const { showError, showSuccess } = useNotification();

  useEffect(() => {
    if (!item) return;
    const abortController = new AbortController();
    fetch(`/api/players?online=true&excludeId=${playerId}`, { signal: abortController.signal })
      .then(res => res.json())
      .then(data => {
        setPlayers(Array.isArray(data) ? data : data.data || []);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.error(err);
      });
    return () => abortController.abort();
  }, [item, playerId]);

  if (!item) return null;

  const maxQuantity = item.quantity ?? item.base_quantity ?? 1;

  const increment = () => setQuantity(prev => Math.min(prev + 1, maxQuantity));
  const decrement = () => setQuantity(prev => Math.max(prev - 1, 1));

  const handleTransfer = async () => {
    if (!selectedPlayerId) {
      showError("Выберите игрока");
      return;
    }
    if (quantity < 1 || quantity > maxQuantity) {
      showError("Некорректное количество");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/player-items/${playerId}/items/${item.player_item_id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPlayerId: selectedPlayerId, quantity }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error);
      }
      showSuccess(`Передано ${quantity} x ${item.name}`);
      onTransfer();
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Ошибка передачи";
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl p-6 w-96 max-w-[90%]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-amber-400">Передать предмет</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200"><X size={24} /></button>
        </div>
        <p className="text-gray-300 mb-4 text-lg">Предмет: <span className="font-semibold">{item.name}</span></p>
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1">Игроку</label>
          <select
            value={selectedPlayerId || ""}
            onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
            className="w-full p-3 rounded-lg bg-gray-700 text-gray-200 text-base"
          >
            <option value="">Выберите игрока</option>
            {players.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-1">Количество (макс. {maxQuantity})</label>
          <div className="flex items-center gap-3">
            <button
              onClick={decrement}
              disabled={quantity <= 1}
              className="p-3 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
            >
              <Minus size={20} />
            </button>
            <span className="flex-1 text-center text-2xl font-bold text-white">{quantity}</span>
            <button
              onClick={increment}
              disabled={quantity >= maxQuantity}
              className="p-3 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
            >
              <Plus size={20} />
            </button>
          </div>
          <input
            type="range"
            min={1}
            max={maxQuantity}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full mt-2"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleTransfer}
            disabled={loading}
            className="flex-1 bg-amber-600 hover:bg-amber-500 py-3 rounded-lg text-lg font-medium"
          >
            {loading ? "Передача..." : "Передать"}
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg text-lg">Отмена</button>
        </div>
      </div>
    </div>
  );
};

export default TransferItemPopover;
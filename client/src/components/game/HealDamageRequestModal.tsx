// client/src/components/game/HealDamageRequestModal.tsx
import React, { useState } from "react";
import { Heart, AlertTriangle, X } from "lucide-react";
import { socket } from "../../lib/socket";
import { useNotification } from "../../hooks/useNotification";

interface HealDamageRequestModalProps {
  playerId: number;
  playerName: string;
  onClose: () => void;
}

export const HealDamageRequestModal: React.FC<HealDamageRequestModalProps> = ({ playerId, playerName, onClose }) => {
  const [amount, setAmount] = useState(1);
  const [isHeal, setIsHeal] = useState(true);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { showSuccess } = useNotification();

  const handleSubmit = () => {
    if (amount <= 0) return;
    setLoading(true);
    socket.emit("heal-damage-request", {
      playerId,
      playerName,
      amount,
      isHeal,
      message,
    });
    showSuccess("Запрос отправлен мастеру");
    onClose();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl p-6 w-96 max-w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-amber-400">Запрос мастеру</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200"><X size={20} /></button>
        </div>
        <p className="text-gray-300 mb-4">Персонаж: <span className="font-semibold">{playerName}</span></p>
        <div className="mb-4">
          <div className="flex gap-3 mb-3">
            <button
              onClick={() => setIsHeal(true)}
              className={`flex-1 py-2 rounded-lg transition-colors ${isHeal ? "bg-green-600" : "bg-gray-700"}`}
            >
              <Heart size={16} className="inline mr-1" /> Лечение
            </button>
            <button
              onClick={() => setIsHeal(false)}
              className={`flex-1 py-2 rounded-lg transition-colors ${!isHeal ? "bg-red-600" : "bg-gray-700"}`}
            >
              <AlertTriangle size={16} className="inline mr-1" /> Урон
            </button>
          </div>
          <label className="block text-sm text-gray-400 mb-1">Значение</label>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full p-2 rounded-lg bg-gray-700 text-gray-200 mb-3"
          />
          <label className="block text-sm text-gray-400 mb-1">Комментарий (необязательно)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 rounded-lg bg-gray-700 text-gray-200"
            rows={2}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-amber-600 hover:bg-amber-500 py-2 rounded-lg transition-colors"
        >
          {loading ? "Отправка..." : "Отправить запрос"}
        </button>
      </div>
    </div>
  );
};
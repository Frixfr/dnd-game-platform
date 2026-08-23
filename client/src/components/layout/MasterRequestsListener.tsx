import { useEffect } from 'react';
import { socket } from '../../lib/socket';
import { useNotification } from '../../hooks/useNotification';

interface HealDamageRequest {
  playerId: number;
  playerName: string;
  amount: number;
  isHeal: boolean;
  message?: string;
  timestamp: string;
}

export const MasterRequestsListener = () => {
  const { showInfo } = useNotification();

  useEffect(() => {
    const handleHealRequest = (data: HealDamageRequest) => {
      const action = data.isHeal ? 'лечение' : 'урон';
      const message = `Запрос от ${data.playerName}: ${action} ${data.amount}`;
      showInfo(message);
      // При необходимости можно добавить кнопку «Принять» через расширенный showNotification
    };

    socket.on('heal-damage-request', handleHealRequest);

    return () => {
      socket.off('heal-damage-request', handleHealRequest);
    };
  }, [showInfo]);

  return null;
};
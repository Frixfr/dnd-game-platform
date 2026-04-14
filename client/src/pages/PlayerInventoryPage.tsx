// client/src/pages/PlayerInventoryPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ItemCard } from '../components/ui/ItemCard';
import ConfirmModal from '../components/ui/ConfirmModal';
import { TransferItemModal } from '../components/ui/TransferItemModal';
import { usePlayerStore } from '../stores/playerStore';
import { useNotification } from '../hooks/useNotification';
import type { PlayerItemExtended, EffectType, RarityType } from '../types';

// Тип ответа от API /api/players/:id/details
interface PlayerDetailsResponse {
  items: Array<{
    id: number;
    name: string;
    description: string | null;
    rarity: string;
    base_quantity: number;
    quantity: number;
    is_equipped: number | boolean;
    is_deletable: boolean;
    is_usable: boolean;
    infinite_uses: boolean;
    active_effects?: EffectType[];
    passive_effects?: EffectType[];
  }>;
}

export const PlayerInventoryPage = () => {
  const { playerId } = useParams();
  const [items, setItems] = useState<PlayerItemExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; itemId: number | null; itemName: string }>({
    isOpen: false,
    itemId: null,
    itemName: '',
  });
  const [transferModal, setTransferModal] = useState<{ isOpen: boolean; itemId: number | null; itemName: string }>({
    isOpen: false,
    itemId: null,
    itemName: '',
  });

  const { executeUseItem, executeDiscardItem, executeTransferItem } = usePlayerStore();
  const { showError, showSuccess } = useNotification();

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch(`/api/players/${playerId}/details`);
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data: PlayerDetailsResponse = await res.json();
      const mapped: PlayerItemExtended[] = (data.items || []).map((item) => ({
        ...item,
        // Приводим rarity к нужному типу (если значение не подходит, по умолчанию 'common')
        rarity: (item.rarity as RarityType) || 'common',
        quantity: item.quantity || 1,
        is_equipped: item.is_equipped === 1 || item.is_equipped === true ? 1 : 0,
        active_effects: item.active_effects || [],
        passive_effects: item.passive_effects || [],
        // Добавляем недостающие поля для совместимости с ItemType
        active_effect_id: null,
        passive_effect_id: null,
        active_effect: null,
        passive_effect: null,
        created_at: '',
        updated_at: '',
      }));
      setItems(mapped);
    } catch {
      showError('Не удалось загрузить инвентарь');
    } finally {
      setLoading(false);
    }
  }, [playerId, showError]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleUse = async (itemId: number, itemName: string) => {
    try {
      await executeUseItem(Number(playerId), itemId);
      showSuccess(`"${itemName}" использован`);
      await fetchInventory();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      showError(message);
    }
  };

  const handleDiscard = async () => {
    if (!confirmModal.itemId) return;
    try {
      await executeDiscardItem(Number(playerId), confirmModal.itemId);
      showSuccess(`"${confirmModal.itemName}" выброшен`);
      await fetchInventory();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      showError(message);
    } finally {
      setConfirmModal({ isOpen: false, itemId: null, itemName: '' });
    }
  };

  const handleTransfer = async (targetPlayerId: number) => {
    if (!transferModal.itemId) return;
    try {
      await executeTransferItem(Number(playerId), transferModal.itemId, targetPlayerId);
      showSuccess(`"${transferModal.itemName}" передан`);
      await fetchInventory();
      setTransferModal({ isOpen: false, itemId: null, itemName: '' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      showError(message);
      throw err;
    }
  };

  if (loading) return <div className="text-center py-12">Загрузка инвентаря...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      {items.length === 0 ? (
        <p className="text-center text-gray-500 py-12">Инвентарь пуст</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item) => (
            <div key={item.id} className="relative">
              <ItemCard item={item} />
              <div className="flex gap-2 mt-2 justify-end">
                {item.is_usable && (item.infinite_uses || (item.quantity && item.quantity > 0)) && (
                  <button
                    onClick={() => handleUse(item.id, item.name)}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Использовать
                  </button>
                )}
                {item.is_deletable && !item.is_equipped && (
                  <>
                    <button
                      onClick={() => setConfirmModal({ isOpen: true, itemId: item.id, itemName: item.name })}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Выбросить
                    </button>
                    <button
                      onClick={() => setTransferModal({ isOpen: true, itemId: item.id, itemName: item.name })}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Передать
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onCancel={() => setConfirmModal({ isOpen: false, itemId: null, itemName: '' })}
        onConfirm={handleDiscard}
        title="Подтверждение"
        message={`Вы уверены, что хотите выбросить "${confirmModal.itemName}"?`}
      />

      {transferModal.isOpen && (
        <TransferItemModal
          onClose={() => setTransferModal({ isOpen: false, itemId: null, itemName: '' })}
          currentPlayerId={Number(playerId)}
          itemName={transferModal.itemName}
          onTransfer={handleTransfer}
        />
      )}
    </div>
  );
};
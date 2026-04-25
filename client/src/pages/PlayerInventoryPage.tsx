// client/src/pages/PlayerInventoryPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ItemCard } from '../components/ui/ItemCard';
import ConfirmModal from '../components/ui/ConfirmModal';
import { TransferItemModal } from '../components/ui/TransferItemModal';
import { usePlayerStore } from '../stores/playerStore';
import { useNotification } from '../hooks/useNotification';
import type { EffectType, RarityType } from '../types';

// Локальный тип – полностью совместим с Item (добавлены недостающие поля)
interface InventoryItem {
  id: number;
  player_item_id: number;
  name: string;
  description: string | null;
  rarity: RarityType;
  base_quantity: number;
  quantity: number;
  is_equipped: boolean;
  is_deletable: boolean;
  is_usable: boolean;
  infinite_uses: boolean;
  active_effects?: EffectType[];
  passive_effects?: EffectType[];
  // ⬇️ добавляем поля, которых не хватало для совместимости с Item (они не используются в ItemCard)
  active_effect_id: null;
  passive_effect_id: null;
  created_at: string;
  updated_at: string;
}

interface PlayerDetailsResponse {
  items: Array<{
    player_item_id: number;
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
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    playerItemId: number | null;
    itemName: string;
  }>({
    isOpen: false,
    playerItemId: null,
    itemName: '',
  });
  const [transferModal, setTransferModal] = useState<{
    isOpen: boolean;
    playerItemId: number | null;
    itemName: string;
    currentQuantity: number;
  }>({
    isOpen: false,
    playerItemId: null,
    itemName: '',
    currentQuantity: 0,
  });

  const { executeUseItem, executeDiscardItem, executeTransferItem } = usePlayerStore();
  const { showError, showSuccess } = useNotification();
  const [discardQuantity, setDiscardQuantity] = useState<number>(1);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [pendingDiscard, setPendingDiscard] = useState<{ playerItemId: number; itemName: string; maxQuantity: number } | null>(null);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch(`/api/players/${playerId}/details`);
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data: PlayerDetailsResponse = await res.json();
      const mapped: InventoryItem[] = (data.items || []).map((item) => ({
        id: item.id,
        player_item_id: item.player_item_id,
        name: item.name,
        description: item.description,
        rarity: (item.rarity as RarityType) || 'common',
        base_quantity: item.base_quantity,
        quantity: item.quantity,
        is_equipped: Boolean(item.is_equipped),
        is_deletable: item.is_deletable,
        is_usable: item.is_usable,
        infinite_uses: item.infinite_uses,
        active_effects: item.active_effects,
        passive_effects: item.passive_effects,
        // ⬇️ заполняем недостающие поля значениями по умолчанию
        active_effect_id: null,
        passive_effect_id: null,
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

  const handleUse = async (playerItemId: number, itemName: string) => {
    try {
      await executeUseItem(Number(playerId), playerItemId);
      showSuccess(`"${itemName}" использован`);
      await fetchInventory();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      showError(message);
    }
  };

  const handleDiscardClick = (playerItemId: number, itemName: string, currentQuantity: number) => {
    if (currentQuantity > 1) {
      setPendingDiscard({ playerItemId, itemName, maxQuantity: currentQuantity });
      setDiscardQuantity(1);
      setShowQuantityModal(true);
    } else {
      setConfirmModal({ isOpen: true, playerItemId, itemName });
    }
  };

  const handleDiscard = async () => {
    if (!confirmModal.playerItemId) return;
    try {
      await executeDiscardItem(Number(playerId), confirmModal.playerItemId);
      showSuccess(`"${confirmModal.itemName}" выброшен`);
      await fetchInventory();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      showError(message);
    } finally {
      setConfirmModal({ isOpen: false, playerItemId: null, itemName: '' });
    }
  };

  const handleDiscardWithQuantity = async () => {
    if (!pendingDiscard) return;
    try {
      await executeDiscardItem(Number(playerId), pendingDiscard.playerItemId, discardQuantity);
      showSuccess(`"${pendingDiscard.itemName}" выброшен в количестве ${discardQuantity}`);
      await fetchInventory();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      showError(message);
    } finally {
      setShowQuantityModal(false);
      setPendingDiscard(null);
      setDiscardQuantity(1);
    }
  };

  const handleTransfer = async (targetPlayerId: number, quantity: number) => {
    if (!transferModal.playerItemId) return;
    try {
      await executeTransferItem(Number(playerId), transferModal.playerItemId, targetPlayerId, quantity);
      showSuccess(`"${transferModal.itemName}" передан в количестве ${quantity}`);
      await fetchInventory();
      setTransferModal({ isOpen: false, playerItemId: null, itemName: '', currentQuantity: 0 });
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
            <div key={item.player_item_id} className="relative">
              {/* ✅ Теперь item полностью совместим с типом Item */}
              <ItemCard item={item} />
              <div className="flex gap-2 mt-2 justify-end">
                {item.is_usable && (item.infinite_uses || (item.quantity && item.quantity > 0)) && (
                  <button
                    onClick={() => handleUse(item.player_item_id, item.name)}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Использовать
                  </button>
                )}
                {item.is_deletable && !item.is_equipped && (
                  <>
                    <button
                      onClick={() => handleDiscardClick(item.player_item_id, item.name, item.quantity)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Выбросить
                    </button>
                    <button
                      onClick={() => setTransferModal({
                        isOpen: true,
                        playerItemId: item.player_item_id,
                        itemName: item.name,
                        currentQuantity: item.quantity
                      })}
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
        onCancel={() => setConfirmModal({ isOpen: false, playerItemId: null, itemName: '' })}
        onConfirm={handleDiscard}
        title="Подтверждение"
        message={`Вы уверены, что хотите выбросить "${confirmModal.itemName}"?`}
      />

      {showQuantityModal && pendingDiscard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Выбросить предмет</h3>
            <p className="mb-2">Выберите количество для "{pendingDiscard.itemName}" (до {pendingDiscard.maxQuantity})</p>
            <input
              type="number"
              min={1}
              max={pendingDiscard.maxQuantity}
              value={discardQuantity}
              onChange={(e) => setDiscardQuantity(Math.min(pendingDiscard.maxQuantity, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 border rounded-xl mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowQuantityModal(false)} className="px-4 py-2 bg-gray-300 rounded-xl">Отмена</button>
              <button onClick={handleDiscardWithQuantity} className="px-4 py-2 bg-red-600 text-white rounded-xl">Выбросить</button>
            </div>
          </div>
        </div>
      )}

      {transferModal.isOpen && (
        <TransferItemModal
          onClose={() => setTransferModal({ isOpen: false, playerItemId: null, itemName: '', currentQuantity: 0 })}
          currentPlayerId={Number(playerId)}
          itemName={transferModal.itemName}
          currentQuantity={transferModal.currentQuantity}
          playerItemId={transferModal.playerItemId!}
          onTransfer={handleTransfer}
        />
      )}
    </div>
  );
};
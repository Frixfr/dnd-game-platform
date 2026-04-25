// client/src/pages/PlayerInventoryPage.tsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ItemCard } from '../components/ui/ItemCard';
import ConfirmModal from '../components/ui/ConfirmModal';
import { TransferItemModal } from '../components/ui/TransferItemModal';
import { usePlayerStore } from '../stores/playerStore';
import { usePlayerSessionStore } from '../stores/playerSessionStore';
import { useNotification } from '../hooks/useNotification';
import type { EffectType, RarityType, PlayerItemExtended } from '../types';

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
  active_effect_id: null;
  passive_effect_id: null;
  created_at: string;
  updated_at: string;
}

const mapPlayerItemToInventoryItem = (item: PlayerItemExtended): InventoryItem => ({
  id: item.id,
  player_item_id: item.player_item_id ?? item.id,
  name: item.name,
  description: item.description,
  rarity: item.rarity,
  base_quantity: item.base_quantity,
  quantity: item.quantity,
  is_equipped: item.is_equipped,
  is_deletable: item.is_deletable,
  is_usable: item.is_usable,
  infinite_uses: item.infinite_uses,
  active_effects: item.active_effects,
  passive_effects: item.passive_effects,
  active_effect_id: null,
  passive_effect_id: null,
  created_at: item.created_at,
  updated_at: item.updated_at,
});

export const PlayerInventoryPage = () => {
  const { playerId } = useParams();
  const { selectedPlayer } = usePlayerSessionStore();
  const { executeUseItem, executeDiscardItem, executeTransferItem } = usePlayerStore();
  const { showError, showSuccess } = useNotification();

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
  const [discardQuantity, setDiscardQuantity] = useState<number>(1);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [pendingDiscard, setPendingDiscard] = useState<{ playerItemId: number; itemName: string; maxQuantity: number } | null>(null);

  const loading = !selectedPlayer || selectedPlayer.id !== Number(playerId);
  const items: InventoryItem[] = (selectedPlayer?.items || []).map(mapPlayerItemToInventoryItem);

  const handleUse = async (playerItemId: number, itemName: string) => {
    try {
      await executeUseItem(Number(playerId), playerItemId);
      showSuccess(`"${itemName}" использован`);
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
              <ItemCard item={item} />
              <div className="flex gap-2 mt-2 justify-end">
                {item.is_usable && (item.infinite_uses || item.quantity > 0) && (
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
                        currentQuantity: item.quantity,
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
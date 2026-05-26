// client/src/components/ui/PlayerItemsManager.tsx
import { useState, useEffect, useCallback } from 'react';
import type { PlayerItemExtended, ItemType } from '../../types';
import { usePlayerStore } from '../../stores/playerStore';
import { useConfirm } from '../../hooks/useConfirm';

interface PlayerItemsManagerProps {
  playerId: number;
  items: PlayerItemExtended[];
  onDataChanged: () => Promise<void>;
  showError: (msg: string) => void;
}

type ItemsSubTab = 'list' | 'add';

export const PlayerItemsManager = ({ playerId, items, onDataChanged, showError }: PlayerItemsManagerProps) => {
  const { confirm, ConfirmModalComponent } = useConfirm();
  const [itemsSubTab, setItemsSubTab] = useState<ItemsSubTab>('list');
  const [allItems, setAllItems] = useState<ItemType[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<{ [key: number]: number }>({});
  const [itemSearch, setItemSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const { executeUseItem } = usePlayerStore();

  const loadAllItems = useCallback(async () => {
    setItemsLoading(true);
    try {
      const response = await fetch('/api/items');
      if (!response.ok) throw new Error();
      setAllItems(await response.json());
    } catch {
      showError('Не удалось загрузить предметы');
    } finally {
      setItemsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (itemsSubTab === 'add') loadAllItems();
  }, [itemsSubTab, loadAllItems]);

  const handleRemoveItem = (itemId: number) => {
    confirm({
      message: 'Удалить предмет?',
      onConfirm: async () => {
        try {
          await fetch(`/api/players/${playerId}/items/${itemId}`, { method: 'DELETE' });
          await onDataChanged();
        } catch {
          showError('Ошибка удаления');
        }
      }
    });
  };

  const handleUseItem = (playerItemId: number, itemName: string) => {
    confirm({
      message: `Использовать предмет "${itemName}"?`,
      onConfirm: async () => {
        try {
          await executeUseItem(playerId, playerItemId);
          await onDataChanged();
          showError(`✅ ${itemName} использован!`);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Ошибка использования предмета';
          showError(message);
        }
      }
    });
  };

  const handleAddItems = async () => {
    const itemsToAdd = Object.entries(selectedItems).map(([id, qty]) => ({ item_id: parseInt(id), quantity: qty }));
    if (itemsToAdd.length === 0) { showError('Выберите предметы'); return; }
    setLoading(true);
    try {
      const response = await fetch(`/api/players/${playerId}/items/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToAdd })
      });
      if (!response.ok) throw new Error();
      setSelectedItems({});
      await onDataChanged();
      setItemsSubTab('list');
    } catch {
      showError('Ошибка добавления');
    } finally {
      setLoading(false);
    }
  };

  const renderCurrentItems = () => {
    if (!items.length) return <p className="text-center text-[#F2E9E4]/60 py-8">📦 Нет предметов</p>;
    return (
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        {items.map(item => {
          const hasActiveEffect = item.active_effects && item.active_effects.length > 0;
          return (
            <div key={item.id} className="bg-[#0A1F44]/50 rounded-xl p-3 md:p-4 border">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                <div>
                  <h4 className="font-semibold">{item.name}</h4>
                  <p className="text-sm text-[#F2E9E4]/60">{item.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs bg-bg-tertiary text-text-secondary px-2 py-0.5 rounded-full border border-border-color">{item.rarity}</span>
                    <span className="text-xs bg-bg-tertiary text-text-secondary px-2 py-0.5 rounded-full border border-border-color">×{item.quantity}</span>
                    {hasActiveEffect && (
                      <span className="text-xs bg-accent-primary/20 text-accent-primary px-2 py-0.5 rounded-full border border-accent-primary/30">⚡ Активный</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-row sm:flex-col items-center gap-3 sm:items-end">
                  {hasActiveEffect && (
                    <button
                      onClick={() => handleUseItem(item.player_item_id || item.id, item.name)}
                      className="px-3 py-1 btn-secondary text-sm"
                    >
                      Использовать
                    </button>
                  )}
                  <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 text-sm">🗑️ Удалить</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAddItems = () => {
    const filtered = allItems.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase()));
    const currentQuantityMap: Record<number, number> = {};
    items.forEach(item => {
      currentQuantityMap[item.id] = item.quantity;
    });

    return (
      <div className="space-y-4">
        <input type="text" placeholder="🔍 Поиск предметов..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} className="form-input w-full" />
        {itemsLoading ? <p className="text-text-secondary">Загрузка...</p> : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {filtered.map(item => {
              const owned = item.id in currentQuantityMap;
              const currentQty = currentQuantityMap[item.id] || 0;
              const qtyToAdd = selectedItems[item.id] || 1;
              return (
                <div key={item.id} className="card p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <p className="font-medium text-text-primary">{item.name}</p>
                    <p className="text-xs text-text-secondary">{item.rarity}</p>
                    {owned && <p className="text-xs text-accent-primary">Уже есть: {currentQty} шт.</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={qtyToAdd}
                      onChange={e => setSelectedItems(prev => ({ ...prev, [item.id]: parseInt(e.target.value) || 1 }))}
                      className="w-16 px-2 py-1 form-input"
                    />
                    <button
                      onClick={() => setSelectedItems(prev => ({ ...prev, [item.id]: (prev[item.id] || 1) }))}
                      className="px-3 py-1 btn-secondary"
                    >
                      {owned ? '➕ Добавить ещё' : '➕ Добавить'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="pt-2 flex flex-col sm:flex-row justify-between items-center gap-2 border-t border-border-color">
          <span className="text-text-primary">Выбрано: {Object.keys(selectedItems).length}</span>
          <button onClick={handleAddItems} disabled={Object.keys(selectedItems).length === 0 || loading} className="w-full sm:w-auto px-4 py-2 btn-primary">Добавить выбранные</button>
        </div>
        <button onClick={() => setItemsSubTab('list')} className="mt-2 text-sm text-text-secondary hover:text-text-primary transition-colors">← Назад к списку</button>
      </div>
    );
  };

  return (
    <div>
      {itemsSubTab === 'list' ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-text-primary">📦 Предметы игрока</h3>
            <button onClick={() => { setItemsSubTab('add'); setSelectedItems({}); }} className="px-3 py-1 btn-secondary text-sm">➕ Добавить предмет</button>
          </div>
          {renderCurrentItems()}
        </div>
      ) : renderAddItems()}
      {ConfirmModalComponent}
    </div>
  );
};
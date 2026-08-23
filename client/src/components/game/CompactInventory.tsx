// client/src/components/game/CompactInventory.tsx
import React, { useState } from "react";
import { Package, Trash2, Send, Zap, ArrowRight } from "lucide-react";
import type { PlayerItemExtended } from "../../types";
import { useNotification } from "../../hooks/useNotification";
import { useConfirm } from "../../hooks/useConfirm";
import TransferItemPopover from "./TransferItemPopover";

interface CompactInventoryProps {
  items: PlayerItemExtended[];
  playerId: number;
  onRefresh: () => void;
}

export const CompactInventory: React.FC<CompactInventoryProps> = ({ items, playerId, onRefresh }) => {
  const [transferItem, setTransferItem] = useState<PlayerItemExtended | null>(null);
  const { showError, showSuccess } = useNotification();
  const { confirm, ConfirmModalComponent } = useConfirm();

  const usableItems = items.filter(i => i.is_usable);
  const recentItems = usableItems.slice(0, 3);

  const handleUse = async (item: PlayerItemExtended) => {
    if (!item.player_item_id) return;
    try {
      const response = await fetch(`/api/player-items/${playerId}/items/${item.player_item_id}/use`, {
        method: "POST",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error);
      }
      showSuccess(`Использован предмет: ${item.name}`);
      onRefresh();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Ошибка использования";
      showError(errorMessage);
    }
  };

  const handleDiscard = (item: PlayerItemExtended) => {
    if (!item.player_item_id) return;
    confirm({
      message: `Выбросить ${item.name}?`,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/player-items/${playerId}/items/${item.player_item_id}/discard`, {
            method: "DELETE",
          });
          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error);
          }
          showSuccess(`Предмет ${item.name} выброшен`);
          onRefresh();
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : "Ошибка выбрасывания";
          showError(errorMessage);
        }
      }
    });
  };

  if (recentItems.length === 0) {
    return <div className="text-[#F2E9E4]/60 text-sm italic">Нет предметов в инвентаре</div>;
  }

  return (
    <div className="space-y-3">
      {recentItems.map((item) => (
        <div key={item.id} className="bg-[#0A1F44]/70 rounded-xl p-4 border border-[#F2E9E4]/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-[#FF0026]" />
              <span className="text-[#F2E9E4] font-medium text-base">{item.name}</span>
              {item.base_quantity > 1 && (
                <span className="text-xs text-[#F2E9E4]/60">x{item.quantity ?? item.base_quantity}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {item.is_usable && (
              <button
                onClick={() => handleUse(item)}
                className="flex-1 py-3 rounded-lg btn-secondary text-base font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Zap size={18} /> Использовать
              </button>
            )}
            {item.is_deletable && (
              <button
                onClick={() => handleDiscard(item)}
                className="flex-1 py-3 rounded-lg bg-[#0A1F44] hover:bg-[#0A1F44]/80 text-[#FF0026] text-base font-medium transition-colors active:scale-95 flex items-center justify-center gap-2 border border-[#FF0026]/30"
              >
                <Trash2 size={18} /> Выбросить
              </button>
            )}
            {item.is_deletable && (
              <button
                onClick={() => setTransferItem(item)}
                className="flex-1 py-3 rounded-lg btn-primary text-base font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Send size={18} /> Передать
              </button>
            )}
          </div>
        </div>
      ))}
      {usableItems.length > 3 && (
        <div className="text-right">
          <button
            className="text-sm text-[#FF0026] hover:text-[#FF0026]/80 inline-flex items-center gap-1"
            onClick={() => {/* Можно добавить переход на страницу инвентаря */}}
          >
            Весь инвентарь <ArrowRight size={14} />
          </button>
        </div>
      )}
      <TransferItemPopover
        item={transferItem}
        playerId={playerId}
        onClose={() => setTransferItem(null)}
        onTransfer={onRefresh}
      />
      {ConfirmModalComponent}
    </div>
  );
};
// client/src/pages/ItemsPage.tsx
import { useState, useEffect } from 'react';
import { CreateItemModal } from '../components/ui/CreateItemModal';
import type { ItemType } from '../types';
import { useItemStore } from '../stores/itemStore';
import { ItemCard } from '../components/ui/ItemCard';
import { EditItemModal } from '../components/ui/EditItemModal';
import { Pagination } from '../components/ui/Pagination';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useErrorHandler } from '../hooks/useErrorHandler';

export const ItemsPage = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemType | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingFullItem, setLoadingFullItem] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ItemType | null>(null);
  const { showError } = useErrorHandler();

  const {
    items,
    itemsTotal,
    currentPage,
    limit,
    fetchItems,
    initializeSocket,
    disconnectSocket,
  } = useItemStore();

  useEffect(() => {
    initializeSocket();
    return () => disconnectSocket?.();
  }, [initializeSocket, disconnectSocket]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchItems(currentPage, limit);
      setLoading(false);
    };
    load();
  }, [currentPage, limit, fetchItems]);

  const handleItemClick = async (item: ItemType) => {
    setLoadingFullItem(true);
    try {
      const response = await fetch(`/api/items/${item.id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedItem(data.item || data);
      } else {
        setSelectedItem(item);
      }
      setIsEditModalOpen(true);
    } catch (error) {
      console.error(error);
      setSelectedItem(item);
      setIsEditModalOpen(true);
    } finally {
      setLoadingFullItem(false);
    }
  };

  const handleItemUpdated = () => {
    setIsEditModalOpen(false);
    setSelectedItem(null);
    fetchItems(currentPage, limit);
  };

  const handleItemCreated = () => {
    setIsCreateModalOpen(false);
    fetchItems(currentPage, limit);
  };

  const handleDeleteItemFromCard = (item: ItemType) => {
    setItemToDelete(item);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const response = await fetch(`/api/items/${itemToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Ошибка удаления');
      alert(`Предмет "${itemToDelete.name}" удален`);
      fetchItems(currentPage, limit);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('используется')) {
        showError(`Невозможно удалить предмет "${itemToDelete.name}", так как он используется игроками или NPC.`);
      } else {
        showError('Не удалось удалить предмет');
      }
    } finally {
      setShowConfirmModal(false);
      setItemToDelete(null);
    }
  };

  const totalPages = Math.ceil(itemsTotal / limit);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Панель предметов</h1>
          <p className="text-gray-600 mt-1">Всего предметов: <span className="font-semibold">{itemsTotal}</span></p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">+ Создать предмет</button>
      </div>

      {loading ? (
        <div className="text-center py-12">Загрузка...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Нет созданных предметов</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                onClick={() => handleItemClick(item)}
                onDelete={() => handleDeleteItemFromCard(item)}
              />
            ))}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => fetchItems(page, limit)} />
        </>
      )}

      {loadingFullItem && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white p-6 rounded">Загрузка...</div></div>}
      {isCreateModalOpen && <CreateItemModal onClose={() => setIsCreateModalOpen(false)} onItemCreated={handleItemCreated} />}
      {isEditModalOpen && selectedItem && <EditItemModal item={selectedItem} onClose={() => { setIsEditModalOpen(false); setSelectedItem(null); }} onItemUpdated={handleItemUpdated} mode="edit" />}
      <ConfirmModal isOpen={showConfirmModal} message={`Удалить "${itemToDelete?.name}"?`} onConfirm={confirmDelete} onCancel={() => { setShowConfirmModal(false); setItemToDelete(null); }} />
    </div>
  );
};

export default ItemsPage;
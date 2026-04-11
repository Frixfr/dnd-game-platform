import { useState, useEffect } from 'react';
import { CreateItemModal } from '../components/ui/CreateItemModal';
import type { EffectType, ItemType } from '../types';
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
  const [effects, setEffects] = useState<EffectType[]>([]);
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
    return () => {
      disconnectSocket();
    };
  }, [initializeSocket, disconnectSocket]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchItems(currentPage, limit);
      setLoading(false);
    };
    load();
  }, [currentPage, limit, fetchItems]);

  useEffect(() => {
    const fetchEffects = async () => {
      try {
        const response = await fetch('/api/effects?limit=9999');
        if (!response.ok) throw new Error('Ошибка загрузки эффектов');
        const result = await response.json();
        const effectsData = Array.isArray(result) ? result : result.data;
        setEffects(effectsData);
      } catch (error) {
        console.error('Ошибка загрузки эффектов:', error);
      }
    };
    fetchEffects();
  }, []);

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
      console.error('Ошибка загрузки данных предмета:', error);
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
  };

  const handleDeleteItemFromCard = (item: ItemType) => {
    setItemToDelete(item);
    setShowConfirmModal(true);
    };

    const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
        const response = await fetch(`/api/items/${itemToDelete.id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Ошибка удаления предмета');
        alert(`Предмет "${itemToDelete.name}" удален`);
    } catch (error: unknown) {
        console.error('Ошибка удаления:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('назначена игрокам')) {
        showError(`Невозможно удалить предмет "${itemToDelete.name}", так как он назначен игрокам. Сначала удалите его у всех игроков.`);
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
          <p className="text-gray-600 mt-1">
            Всего предметов: <span className="font-semibold">{itemsTotal}</span>
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          + Создать предмет
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Загрузка предметов...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
          <p className="text-lg mb-2">Нет созданных предметов</p>
          <p className="mb-4">Нажмите кнопку выше для создания первого предмета</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                effects={effects}
                onClick={() => handleItemClick(item)}
                onDelete={() => handleDeleteItemFromCard(item)}
              />
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => fetchItems(page, limit)}
          />
        </>
      )}

      {loadingFullItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-700">Загрузка данных предмета...</p>
            </div>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <CreateItemModal
          onClose={() => setIsCreateModalOpen(false)}
          effects={effects}
          onItemCreated={handleItemCreated}
        />
      )}

      {isEditModalOpen && selectedItem && (
        <EditItemModal
          item={selectedItem}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedItem(null);
          }}
          onItemUpdated={handleItemUpdated}
          mode="edit"
        />
      )}

      <ConfirmModal
        isOpen={showConfirmModal}
        message={`Вы уверены, что хотите удалить предмет "${itemToDelete?.name}"?`}
        onConfirm={confirmDelete}
        onCancel={() => {
            setShowConfirmModal(false);
            setItemToDelete(null);
        }}
        />
    </div>
  );
};

export default ItemsPage;
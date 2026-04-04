import { useState, useEffect } from 'react';
import { CreateItemModal } from '../components/ui/CreateItemModal';
import type { EffectType, ItemType } from '../types';
import { useItemStore } from '../stores/itemStore';
import { ItemCard } from '../components/ui/ItemCard';
import { EditItemModal } from '../components/ui/EditItemModal';

export const ItemsPage = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ItemType | null>(null);
    const [effects, setEffects] = useState<EffectType[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingFullItem, setLoadingFullItem] = useState(false);
    const { items, initializeSocket, disconnectSocket } = useItemStore();

    // Инициализация сокетов при монтировании
    useEffect(() => {
        initializeSocket();
        return () => {
        disconnectSocket();
        };
    }, [initializeSocket, disconnectSocket]);
  
    // Загрузка начальных данных
    useEffect(() => {
        const fetchEffects = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/effects');
                if (!response.ok) throw new Error('Ошибка загрузки эффектов');
                const effectsData = await response.json();
                setEffects(effectsData);
            } catch (error) {
                console.error('Ошибка загрузки эффектов:', error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchEffects();        
    }, []);

    const handleItemClick = async (item: ItemType) => {
        setLoadingFullItem(true);
        try {
            // Загружаем полные данные предмета
            // Если есть отдельный endpoint для получения предмета по ID, используем его
            // Если нет, используем существующие данные и обогащаем их эффектами
            const response = await fetch(`http://localhost:5000/api/items/${item.id}`);
            if (response.ok) {
                const data = await response.json();
                setSelectedItem(data.item || data);
            } else {
                // Если endpoint не существует, используем существующие данные
                setSelectedItem(item);
            }
            setIsEditModalOpen(true);
        } catch (error) {
            console.error('Ошибка загрузки данных предмета:', error);
            // Если не удалось загрузить, открываем с базовыми данными
            setSelectedItem(item);
            setIsEditModalOpen(true);
        } finally {
            setLoadingFullItem(false);
        }
    };

    const handleItemUpdated = () => {
        // Обновление происходит через сокеты через itemStore
        setIsEditModalOpen(false);
        setSelectedItem(null);
    };

    const handleItemCreated = () => {
        // Обновление происходит через сокеты
        setIsCreateModalOpen(false);
    };

    const handleEditItem = (item: ItemType) => {
        setSelectedItem(item);
        setIsEditModalOpen(true);
    };

    const handleDeleteItemFromCard = async (item: ItemType) => {
        if (!confirm(`Вы уверены, что хотите удалить предмет "${item.name}"?`)) {
            return;
        }
        
        try {
            const response = await fetch(`http://localhost:5000/api/items/${item.id}`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                throw new Error('Ошибка удаления предмета');
            }
            
            alert(`Предмет "${item.name}" удален`);
        } catch (error: unknown) { // ← вместо any используем unknown
            console.error('Ошибка удаления:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('назначена игрокам')) {
            alert(`Невозможно удалить предмет "${item.name}", так как он назначен игрокам. Сначала удалите его у всех игроков.`);
            } else {
                alert('Не удалось удалить предмет');
            }
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Панель предметов</h1>
                    <p className="text-gray-600 mt-1">
                        Всего предметов: <span className="font-semibold">{items.length}</span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map(item => (
                        <ItemCard 
                            key={item.id} 
                            item={item} 
                            effects={effects}
                            onClick={() => handleItemClick(item)}
                            showActions={true}
                            onEdit={() => handleEditItem(item)}
                            onDelete={() => handleDeleteItemFromCard(item)}
                        />
                    ))}
                </div>
            )}
            
            {/* Индикатор загрузки полных данных */}
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
            
            {/* Модальное окно создания предмета */}
            {isCreateModalOpen && (
                <CreateItemModal 
                    onClose={() => setIsCreateModalOpen(false)} 
                    effects={effects}
                    onItemCreated={handleItemCreated}
                />
            )}
            
            {/* Модальное окно редактирования предмета */}
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
        </div>
    );
};

export default ItemsPage;
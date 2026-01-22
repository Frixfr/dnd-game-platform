import { useState, useEffect } from 'react';
import { CreateItemModal } from '../components/ui/CreateItemModal';
import type { EffectType, ItemType } from '../types';
import { useItemStore } from '../stores/itemStore';
import { ItemCard } from '../components/ui/ItemCard';

export const ItemsPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [effects, setEffects] = useState<EffectType[]>([]);
    const [loading, setLoading] = useState(true);
    const { items, initializeSocket, socket } = useItemStore();

    // Инициализация сокетов при монтировании
    useEffect(() => {
      initializeSocket();
    }, [initializeSocket]);
  
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
        
        // Отписка от сокетов при размонтировании (опционально)
        return () => {
            if (socket) {
                socket.off('itemCreated');
                socket.off('connect');
            }
        };
    }, [socket]);

    const isLoading = loading || items.length === 0;

    return (
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Панель предметов</h1>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              + Создать предмет
            </button>
          </div> 

        {loading ? (
            <div className="text-center py-12">Загрузка предметов...</div>
        ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
            Нет созданных игроков. Нажмите кнопку выше для создания первого.
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => (
                <ItemCard 
                key={item.id} 
                item={item} 
                effects={effects}
                onClick={() => alert(`Редактирование предмета ${item.name} (ID: ${item.id})`)} 
                />
            ))}
            </div>
        )}

          {isModalOpen && <CreateItemModal onClose={() => setIsModalOpen(false)} effects={effects} />}      
        </div>
      );
};

export default ItemsPage;
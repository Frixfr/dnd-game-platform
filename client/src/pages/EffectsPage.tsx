import { useState, useEffect } from 'react';
import { CreateEffectModal } from '../components/ui/CreateEffectModal';
import type { EffectType } from '../types';
import { EffectCard } from '../components/ui/EffectCard';
import { useEffectStore } from '../stores/effectStore';

export const EffectsPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [effects, setEffects] = useState<EffectType[]>([]);
    const [loading, setLoading] = useState(true);
    const { initializeSocket, socket } = useEffectStore();

    // Инициализация сокетов при монтировании
    useEffect(() => {
        initializeSocket();
    }, []);
    
    // Загрузка начальных данных
    useEffect(() => {
        const fetchData = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/effects');
            if (!response.ok) throw new Error('Ошибка загрузки');
            const data = await response.json();
            setEffects(data);
        } catch (error) {
            console.error('Ошибка:', error);
        } finally {
            setLoading(false);
        }
        };
            
        fetchData();
            
        // Подписка на события сокетов (Zustand уже обрабатывает это через стор)
        return () => {
        if (socket) socket.off('effectCreated');
        };
    }, [socket]);

    return (
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Панель эффектов</h1>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              + Создать эффект
            </button>
          </div>
          {loading ? (
              <div className="text-center py-12">Загрузка...</div>
            ) : effects.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Нет созданных эффектов. Нажмите кнопку выше для создания первого.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {effects.map(effect => (
                  <EffectCard 
                    key={effect.id} 
                    effect={effect} 
                    onClick={() => alert(`Редактирование игрока ${effect.name} (ID: ${effect.id})`)} 
                  />
                ))}
              </div>
            )}  
          {isModalOpen && <CreateEffectModal onClose={() => setIsModalOpen(false)} />}       
        </div>
      );
};

export default EffectsPage;
import { useState, useEffect } from 'react';
import { CreateEffectModal } from '../components/ui/CreateEffectModal';
import type { EffectType } from '../types';
import { EffectCard } from '../components/ui/EffectCard';
import { useEffectStore } from '../stores/effectStore';
import { EditEffectModal } from '../components/ui/EditEffectModal';

export const EffectsPage = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Cостояние для редактирования
    const [selectedEffect, setSelectedEffect] = useState<EffectType | null>(null); // Cостояние для выбранного эффекта
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

    const handleEffectClick = async (effect: EffectType) => {
      setSelectedEffect(effect);
      setIsEditModalOpen(true);
    };

    const handleEffectUpdated = (updatedEffect: EffectType) => {
      // Обновление происходит через сокеты или можно обновить локально
      setEffects(prev => prev.map(e => e.id === updatedEffect.id ? updatedEffect : e));
      setIsEditModalOpen(false);
      setSelectedEffect(null);
    };

    const handleEffectCreated = (newEffect: EffectType) => {
      setEffects(prev => [...prev, newEffect]);
      setIsCreateModalOpen(false);
    };

    const handleDeleteEffect = async () => {
      if (!selectedEffect || !confirm(`Вы уверены, что хотите удалить эффект "${selectedEffect.name}"?`)) {
        return;
      }
      
      try {
        const response = await fetch(`http://localhost:5000/api/effects/${selectedEffect.id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error('Ошибка удаления эффекта');
        }
        
        setEffects(prev => prev.filter(e => e.id !== selectedEffect.id));
        setIsEditModalOpen(false);
        setSelectedEffect(null);
        alert(`Эффект "${selectedEffect.name}" удален`);
      } catch (error: any) {
        console.error('Ошибка удаления:', error);
        alert('Не удалось удалить эффект');
      }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">Панель эффектов</h1>
              <p className="text-gray-600 mt-1">
                Всего эффектов: <span className="font-semibold">{effects.length}</span>
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
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
                    onClick={() => handleEffectClick(effect)} 
                  />
                ))}
              </div>
            )}  
          
          {isCreateModalOpen && (
            <CreateEffectModal 
              onClose={() => setIsCreateModalOpen(false)} 
            />
          )}
          
          {isEditModalOpen && selectedEffect && (
            <EditEffectModal
              effect={selectedEffect}
              onClose={() => {
                setIsEditModalOpen(false);
                setSelectedEffect(null);
              }}
              onEffectUpdated={handleEffectUpdated}
              mode="edit"
            />
          )}
        </div>
      );
};

export default EffectsPage;
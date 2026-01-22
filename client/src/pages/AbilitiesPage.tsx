import { useState, useEffect } from 'react';
import { CreateAbilityModal } from '../components/ui/CreateAbilityModal';
import { AbilityCard } from '../components/ui/AbilityCard';
import type { AbilityType, EffectType } from '../types';
import { useAbilityStore } from '../stores/abilityStore';

export const AbilitiesPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [effects, setEffects] = useState<EffectType[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Используем хранилище Zustand
    const { abilities, initializeSocket, socket } = useAbilityStore();

    // Инициализация сокетов
    useEffect(() => {
        initializeSocket();
    }, [initializeSocket]);
    
    // Загрузка эффектов для модального окна
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
        
        return () => {
            if (socket) {
                socket.off('abilityCreated');
            }
        };
    }, [socket]);

    const isLoading = loading || abilities.length === 0;

    return (
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Панель способностей</h1>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              + Создать способность
            </button>
          </div> 

          {loading ? (
                  <div className="text-center py-12">Загрузка способностей...</div>
                ) : abilities.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    Нет созданных способностей. Нажмите кнопку выше для создания первой.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {abilities.map(ability => (
                      <AbilityCard 
                        key={ability.id} 
                        ability={ability} 
                        onClick={() => alert(`Редактирование способности ${ability.name} (ID: ${ability.id})`)} 
                      />
                    ))}
                  </div>
                )}
          {isModalOpen && <CreateAbilityModal onClose={() => setIsModalOpen(false)} />}       
        </div>
    );
};

export default AbilitiesPage;
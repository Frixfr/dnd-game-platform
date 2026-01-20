import { useState, useEffect } from 'react';
import { CreateAbilityModal } from '../components/ui/CreateAbilityModal';
import { AbilityCard } from '../components/ui/AbilityCard';
import type { AbilityType } from '../types';
import { useAbilityStore } from '../stores/abilityStore';

export const AbilitiesPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [abilities, setAbilities] = useState<AbilityType[]>([]);
    const [loading, setLoading] = useState(true);
    const { initializeSocket, socket } = useAbilityStore();

    // Инициализация сокетов при монтировании
    useEffect(() => {
        initializeSocket();
    }, []);

    // Загрузка начальных данных
    useEffect(() => {
        const fetchData = async () => {
        try {
            const [abilitiesRes, effectsRes] = await Promise.all([
                fetch('http://localhost:5000/api/abilities'),
                fetch('http://localhost:5000/api/effects')
            ]);
            
            if (!abilitiesRes.ok || !effectsRes.ok) {
                throw new Error('Ошибка загрузки данных');
            }
            
            const abilitiesData = await abilitiesRes.json();
            const effectsData = await effectsRes.json();
            
            // Создаем карту effects для быстрого поиска
            const effectsMap = new Map(effectsData.map(effect => [effect.id, effect]));
            
            const abilitiesWithEffects = abilitiesData.map(ability => {
                const { effect_id, ...rest } = ability;
                return {
                    ...rest,
                    effect: effect_id ? effectsMap.get(effect_id) || null : null
                };
            });
            
            setAbilities(abilitiesWithEffects);
        } catch (error) {
            console.error('Ошибка:', error);
        } finally {
            setLoading(false);
        }
    };
        
        fetchData();
        
        // Подписка на события сокетов (Zustand уже обрабатывает это через стор)
        return () => {
        if (socket) socket.off('abilityCreated');
        };
    }, [socket]);

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
                  <div className="text-center py-12">Загрузка...</div>
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
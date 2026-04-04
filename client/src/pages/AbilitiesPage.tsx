import { useState, useEffect } from 'react';
import { CreateAbilityModal } from '../components/ui/CreateAbilityModal';
import { AbilityCard } from '../components/ui/AbilityCard';
import type { AbilityType, EffectType } from '../types';
import { useAbilityStore } from '../stores/abilityStore';
import { EditAbilityModal } from '../components/ui/EditAbilityModal';

export const AbilitiesPage = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedAbility, setSelectedAbility] = useState<AbilityType | null>(null);
    const [effects, setEffects] = useState<EffectType[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingFullAbility, setLoadingFullAbility] = useState(false);
    
    const { abilities, initializeSocket, fetchAbilities, socket } = useAbilityStore();

    // Инициализация сокета и загрузка списка способностей
    useEffect(() => {
        initializeSocket();
        fetchAbilities(); // <-- ВАЖНО: загружаем способности при монтировании
    }, [initializeSocket, fetchAbilities]);
    
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

    const handleAbilityClick = async (ability: AbilityType) => {
      setLoadingFullAbility(true);
      try {
        const response = await fetch(`http://localhost:5000/api/abilities/${ability.id}`);
        if (!response.ok) throw new Error('Ошибка загрузки данных способности');
        const fullAbility = await response.json();
        setSelectedAbility(fullAbility);
        setIsEditModalOpen(true);
      } catch (error) {
        console.error('Ошибка загрузки данных способности:', error);
        setSelectedAbility(ability);
        setIsEditModalOpen(true);
      } finally {
        setLoadingFullAbility(false);
      }
    };

    const handleAbilityUpdated = () => {
      setIsEditModalOpen(false);
      setSelectedAbility(null);
    };

    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Панель способностей</h1>
            <p className="text-gray-600 mt-1">
              Всего способностей: <span className="font-semibold">{abilities.length}</span>
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            + Создать способность
          </button>
        </div> 

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Загрузка способностей...</p>
          </div>
        ) : abilities.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
            <p className="text-lg mb-2">Нет созданных способностей</p>
            <p className="mb-4">Нажмите кнопку выше для создания первой способности</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {abilities.map(ability => (
              <AbilityCard 
                key={ability.id} 
                ability={ability} 
                onClick={() => handleAbilityClick(ability)}
                disabled={loadingFullAbility}
                effect={effects.find(effect => effect.id === ability.effect_id)}
              />
            ))}
          </div>
        )}
        
        {loadingFullAbility && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-700">Загрузка данных способности...</p>
              </div>
            </div>
          </div>
        )}
        
        {isCreateModalOpen && (
          <CreateAbilityModal 
            onClose={() => setIsCreateModalOpen(false)} 
            effects={effects}
          />
        )}
        
        {isEditModalOpen && selectedAbility && (
          <EditAbilityModal
            ability={selectedAbility}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedAbility(null);
            }}
            onAbilityUpdated={handleAbilityUpdated}
            mode="edit"
            effects={effects}
          />
        )}
      </div>
    );
};

export default AbilitiesPage;
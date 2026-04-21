import { useState, useEffect } from 'react';
import { CreateAbilityModal } from '../components/ui/CreateAbilityModal';
import { AbilityCard } from '../components/ui/AbilityCard';
import type { AbilityType, EffectType } from '../types';
import { useAbilityStore } from '../stores/abilityStore';
import { EditAbilityModal } from '../components/ui/EditAbilityModal';
import { Pagination } from '../components/ui/Pagination';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useErrorHandler } from '../hooks/useErrorHandler';

export const AbilitiesPage = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAbility, setSelectedAbility] = useState<AbilityType | null>(null);
  const [effects, setEffects] = useState<EffectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [abilityToDelete, setAbilityToDelete] = useState<AbilityType | null>(null);
  const { showError } = useErrorHandler();

  const {
    abilities,
    abilitiesTotal,
    currentPage,
    limit,
    fetchAbilities,
    initializeSocket,
  } = useAbilityStore();

  useEffect(() => {
    initializeSocket();
  }, [initializeSocket]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchAbilities(currentPage, limit);
      setLoading(false);
    };
    load();
  }, [currentPage, limit, fetchAbilities]);

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

  const handleAbilityClick = async (ability: AbilityType) => {
    try {
      const response = await fetch(`/api/abilities/${ability.id}`);
      if (!response.ok) throw new Error('Ошибка загрузки данных способности');
      const fullAbility = await response.json();
      setSelectedAbility(fullAbility);
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Ошибка загрузки данных способности:', error);
      setSelectedAbility(ability);
      setIsEditModalOpen(true);
    }
  };

  const handleAbilityUpdated = () => {
    setIsEditModalOpen(false);
    setSelectedAbility(null);
    fetchAbilities(currentPage, limit);
  };

  const handleDeleteAbility = (ability: AbilityType) => {
    setAbilityToDelete(ability);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!abilityToDelete) return;
    try {
      const response = await fetch(`/api/abilities/${abilityToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Ошибка удаления');
    } catch (error) {
      console.error(error);
      showError('Не удалось удалить способность');
    } finally {
      setShowConfirmModal(false);
      setAbilityToDelete(null);
    }
  };

  const totalPages = Math.ceil(abilitiesTotal / limit);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Панель способностей</h1>
          <p className="text-gray-600 mt-1">
            Всего способностей: <span className="font-semibold">{abilitiesTotal}</span>
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
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {abilities.map(ability => (
              <AbilityCard
                key={ability.id}
                ability={ability}
                effect={effects.find(e => e.id === ability.effect_id)}
                onClick={() => handleAbilityClick(ability)}
                onDelete={() => handleDeleteAbility(ability)}
              />
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => fetchAbilities(page, limit)}
          />
        </>
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

      <ConfirmModal
        isOpen={showConfirmModal}
        message={`Удалить способность "${abilityToDelete?.name}"?`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowConfirmModal(false);
          setAbilityToDelete(null);
        }}
      />
    </div>
  );
};

export default AbilitiesPage;
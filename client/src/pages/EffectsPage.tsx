// client/src/pages/EffectsPage.tsx
import { useState, useEffect } from 'react';
import { CreateEffectModal } from '../components/ui/CreateEffectModal';
import { EditEffectModal } from '../components/ui/EditEffectModal';
import { EffectCard } from '../components/ui/EffectCard';
import { Pagination } from '../components/ui/Pagination';
import { useEffectStore } from '../stores/effectStore';
import type { EffectType } from '../types';
import ConfirmModal from '../components/ui/ConfirmModal';

export const EffectsPage = () => {
  const {
    effects,
    effectsTotal,
    currentPage,
    limit,
    fetchEffects,
    initializeSocket,
  } = useEffectStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState<EffectType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [effectToDelete, setEffectToDelete] = useState<EffectType | null>(null);

  useEffect(() => {
    initializeSocket();
  }, [initializeSocket]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchEffects(currentPage, limit);
      setLoading(false);
    };
    load();
  }, [currentPage, limit, fetchEffects]);

  const handleEffectClick = (effect: EffectType) => {
    setSelectedEffect(effect);
    setIsEditModalOpen(true);
  };

  const filteredEffects = effects.filter(effect => {
    const term = searchTerm.toLowerCase();
    return (
      effect.name.toLowerCase().includes(term) ||
      (effect.description?.toLowerCase().includes(term)) ||
      effect.tags.some(tag => tag.toLowerCase().includes(term))
    );
  });

  const handleDeleteEffect = (effect: EffectType) => {
    setEffectToDelete(effect);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!effectToDelete) return;
    try {
      const response = await fetch(`/api/effects/${effectToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Ошибка удаления');
    } catch (error) {
      console.error(error);
      alert('Не удалось удалить эффект');
    } finally {
      setShowConfirmModal(false);
      setEffectToDelete(null);
    }
  };

  const totalPages = Math.ceil(effectsTotal / limit);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Панель эффектов</h1>
          <p className="text-gray-600 mt-1">
            Всего эффектов: <span className="font-semibold">{effectsTotal}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Поиск по названию, описанию или тегу..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            + Создать эффект
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Загрузка эффектов...</p>
        </div>
      ) : filteredEffects.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
          {effects.length === 0
            ? "Нет созданных эффектов. Нажмите кнопку выше для создания первого."
            : "Ничего не найдено по вашему запросу."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEffects.map((effect) => (
              <EffectCard
                key={effect.id}
                effect={effect}
                onClick={() => handleEffectClick(effect)}
                onDelete={() => handleDeleteEffect(effect)}
              />
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => fetchEffects(page, limit)}
          />
        </>
      )}

      {isCreateModalOpen && (
        <CreateEffectModal onClose={() => setIsCreateModalOpen(false)} />
      )}

      {isEditModalOpen && selectedEffect && (
        <EditEffectModal
          effect={selectedEffect}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedEffect(null);
          }}
          onEffectUpdated={() => {
            setIsEditModalOpen(false);
            setSelectedEffect(null);
            fetchEffects(currentPage, limit);
          }}
          mode="edit"
        />
      )}

      <ConfirmModal
        isOpen={showConfirmModal}
        message={`Удалить эффект "${effectToDelete?.name}"?`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowConfirmModal(false);
          setEffectToDelete(null);
        }}
      />
    </div>
  );
};

export default EffectsPage;
// client/src/pages/EffectsPage.tsx
import { useState, useEffect } from 'react';
import { CreateEffectModal } from '../components/ui/CreateEffectModal';
import { EditEffectModal } from '../components/ui/EditEffectModal';
import { EffectCard } from '../components/ui/EffectCard';
import { useEffectStore } from '../stores/effectStore';
import type { EffectType } from '../types';

export const EffectsPage = () => {
  const { effects, initializeSocket } = useEffectStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState<EffectType | null>(null);

  // Инициализируем сокет один раз при монтировании
  useEffect(() => {
    initializeSocket();
  }, [initializeSocket]);

  const handleEffectClick = (effect: EffectType) => {
    setSelectedEffect(effect);
    setIsEditModalOpen(true);
  };

  const handleDeleteEffect = async (effect: EffectType) => {
    if (!confirm(`Удалить эффект "${effect.name}"?`)) return;
    try {
      const response = await fetch(`http://localhost:5000/api/effects/${effect.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Ошибка удаления');
      // Стор обновится через сокет (useEffectStore)
    } catch (error) {
      console.error(error);
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

      {effects.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Нет созданных эффектов. Нажмите кнопку выше для создания первого.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {effects.map((effect) => (
            <EffectCard
              key={effect.id}
              effect={effect}
              onClick={() => handleEffectClick(effect)}
              onDelete={() => handleDeleteEffect(effect)}
            />
          ))}
        </div>
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
            // Стор обновится через сокет, просто закрываем модалку
            setIsEditModalOpen(false);
            setSelectedEffect(null);
          }}
          mode="edit"
        />
      )}
    </div>
  );
};

export default EffectsPage;
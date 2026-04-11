import { useState, useEffect } from 'react';
import { EditRaceModal } from '../components/ui/EditRaceModal';
import { RaceCard } from '../components/ui/RaceCard';
import { useRaceStore } from '../stores/raceStore';
import { CreateRaceModal } from '../components/ui/CreateRaceModal';
import type { RaceType } from '../types';
import ConfirmModal from '../components/ui/ConfirmModal';

export const RacesPage = () => {
  const { races, initializeSocket, fetchRaces } = useRaceStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRace, setSelectedRace] = useState<RaceType | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [raceToDelete, setRaceToDelete] = useState<RaceType | null>(null);

  useEffect(() => {
    initializeSocket();
    fetchRaces();
  }, [initializeSocket, fetchRaces]);

  const handleEdit = (race: RaceType) => {
    setSelectedRace(race);
    setIsModalOpen(true);
  };

  const handleDelete = (race: RaceType) => {
    setRaceToDelete(race);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!raceToDelete) return;
    try {
      const response = await fetch(`/api/races/${raceToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Ошибка ${response.status}: не удалось удалить расу`);
      }
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Не удалось удалить расу');
    } finally {
      setShowConfirmModal(false);
      setRaceToDelete(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Расы</h1>
          <p className="text-gray-600 mt-1">Всего рас: {races.length}</p>
        </div>
        <button onClick={() => setIsCreateOpen(true)}>+ Создать расу</button>
      </div>

      {races.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Нет созданных рас. Нажмите кнопку выше для создания первой.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {races.map((race) => (
            <RaceCard key={race.id} race={race} onClick={() => handleEdit(race)} onDelete={() => handleDelete(race)} />
          ))}
        </div>
      )}

      {isModalOpen && (
        <EditRaceModal
          race={selectedRace}
          onClose={() => setIsModalOpen(false)}
          onRaceSaved={() => {
            setIsModalOpen(false);
            fetchRaces();
          }}
        />
      )}

      {isCreateOpen && <CreateRaceModal onClose={() => setIsCreateOpen(false)} />}
      
      <ConfirmModal
        isOpen={showConfirmModal}
        message={`Удалить расу "${raceToDelete?.name}"?`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowConfirmModal(false);
          setRaceToDelete(null);
        }}
      />
    </div>
  );
};
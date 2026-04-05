import { useState, useEffect } from 'react';
import { EditRaceModal } from '../components/ui/EditRaceModal';
import { RaceCard } from '../components/ui/RaceCard';
import { useRaceStore } from '../stores/raceStore';
import type { RaceType } from '../types';

export const RacesPage = () => {
  const { races, initializeSocket, fetchRaces, removeRace } = useRaceStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRace, setSelectedRace] = useState<RaceType | null>(null);

  useEffect(() => {
    initializeSocket();
    fetchRaces();
  }, [initializeSocket, fetchRaces]);

  const handleCreate = () => {
    setSelectedRace(null);
    setIsModalOpen(true);
  };

  const handleEdit = (race: RaceType) => {
    setSelectedRace(race);
    setIsModalOpen(true);
  };

  const handleDelete = async (race: RaceType) => {
    if (!confirm(`Удалить расу "${race.name}"?`)) return;
    try {
      const response = await fetch(`/api/races/${race.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      // стор обновится через сокет
    } catch (error) {
      console.error(error);
      alert('Не удалось удалить расу');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Расы</h1>
          <p className="text-gray-600 mt-1">Всего рас: {races.length}</p>
        </div>
        <button onClick={handleCreate} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          + Создать расу
        </button>
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
    </div>
  );
};
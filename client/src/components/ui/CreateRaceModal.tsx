// client/src/components/ui/CreateRaceModal.tsx
import { useState } from 'react';
import { useRaceStore } from '../../stores/raceStore';

export const CreateRaceModal = ({ onClose }: { onClose: () => void }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { fetchRaces } = useRaceStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Название расы обязательно');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/races', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description || null, effect_ids: [] }),
      });
      if (!res.ok) throw new Error();
      await fetchRaces();
      onClose();
    } catch {
      setError('Ошибка создания');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-2xl font-bold">Создание расы</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium mb-1">Название *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Описание</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl"
              disabled={loading}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl">Отмена</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-500 text-white rounded-xl">Создать</button>
          </div>
        </form>
      </div>
    </div>
  );
};
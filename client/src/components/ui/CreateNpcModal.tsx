// client/src/components/ui/CreateNpcModal.tsx
import { useEffect, useState } from "react";
import { useNpcStore } from "../../stores/npcStore";
import type { RaceType } from "../../types";

export const CreateNpcModal = ({ onClose }: { onClose: () => void }) => {
  const [formData, setFormData] = useState({
    name: "",
    gender: "male" as "male" | "female",
    health: 50,
    max_health: 50,
    armor: 10,
    strength: 0,
    agility: 0,
    intelligence: 0,
    physique: 0,
    wisdom: 0,
    charisma: 0,
    history: "",
    in_battle: false,
    is_online: false,
    is_card_shown: true,
    aggression: 0 as 0 | 1 | 2,
    raceId: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { fetchNpcs } = useNpcStore();
  const [raceId, setRaceId] = useState<number | null>(null);
  const [races, setRaces] = useState<RaceType[]>([]);

  useEffect(() => {
    fetch('/api/races').then(res => res.json()).then(setRaces);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Имя обязательно");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("http://localhost:5000/api/npcs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error("Ошибка создания");
      await fetchNpcs();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-2xl font-bold mb-4">Создать NPC</h2>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Имя *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full p-2 border rounded" disabled={loading} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пол</label>
            <div className="flex gap-4">
              <label className="flex items-center"><input type="radio" name="gender" value="male" checked={formData.gender === "male"} onChange={() => setFormData({ ...formData, gender: "male" })} className="mr-2" disabled={loading} /> Мужской</label>
              <label className="flex items-center"><input type="radio" name="gender" value="female" checked={formData.gender === "female"} onChange={() => setFormData({ ...formData, gender: "female" })} className="mr-2" disabled={loading} /> Женский</label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Раса</label>
            <select
              value={raceId ?? ''}
              onChange={(e) => setRaceId(e.target.value ? Number(e.target.value) : null)}
              className="w-full p-2 border rounded"
            >
              <option value="">Нет</option>
              {races.map(race => (
                <option key={race.id} value={race.id}>{race.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Макс. здоровье</label>
              <input type="number" value={formData.max_health} onChange={(e) => setFormData({ ...formData, max_health: +e.target.value, health: +e.target.value })} className="w-full p-2 border rounded" disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Броня</label>
              <input type="number" value={formData.armor} onChange={(e) => setFormData({ ...formData, armor: +e.target.value })} className="w-full p-2 border rounded" disabled={loading} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className="block text-xs">Сила</label><input type="number" value={formData.strength} onChange={(e) => setFormData({ ...formData, strength: +e.target.value })} className="w-full p-1 border rounded" disabled={loading} /></div>
            <div><label className="block text-xs">Ловкость</label><input type="number" value={formData.agility} onChange={(e) => setFormData({ ...formData, agility: +e.target.value })} className="w-full p-1 border rounded" disabled={loading} /></div>
            <div><label className="block text-xs">Интеллект</label><input type="number" value={formData.intelligence} onChange={(e) => setFormData({ ...formData, intelligence: +e.target.value })} className="w-full p-1 border rounded" disabled={loading} /></div>
            <div><label className="block text-xs">Телосложение</label><input type="number" value={formData.physique} onChange={(e) => setFormData({ ...formData, physique: +e.target.value })} className="w-full p-1 border rounded" disabled={loading} /></div>
            <div><label className="block text-xs">Мудрость</label><input type="number" value={formData.wisdom} onChange={(e) => setFormData({ ...formData, wisdom: +e.target.value })} className="w-full p-1 border rounded" disabled={loading} /></div>
            <div><label className="block text-xs">Харизма</label><input type="number" value={formData.charisma} onChange={(e) => setFormData({ ...formData, charisma: +e.target.value })} className="w-full p-1 border rounded" disabled={loading} /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Агрессия</label>
            <select value={formData.aggression} onChange={(e) => setFormData({ ...formData, aggression: +e.target.value as 0|1|2 })} className="w-full p-2 border rounded" disabled={loading}>
              <option value={0}>Мирный</option>
              <option value={1}>Нейтральный</option>
              <option value={2}>Агрессивный</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">История</label>
            <textarea value={formData.history} onChange={(e) => setFormData({ ...formData, history: e.target.value })} className="w-full p-2 border rounded" rows={2} disabled={loading} />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded" disabled={loading}>Отмена</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50">
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
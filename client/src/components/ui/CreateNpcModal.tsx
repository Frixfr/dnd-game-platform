// client/src/components/ui/CreateNpcModal.tsx - Новый дизайн
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
      const response = await fetch("/api/npcs", {
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
    <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div className="modal-content w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="modal-header px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold modal-title">Создать NPC</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-2xl leading-none">
            &times;
          </button>
        </div>
        
        <div className="p-6">
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-[#FF0026]/30 text-[#FF0026] rounded-xl text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium form-label mb-1">Имя *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full form-input" disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-medium form-label mb-1">Пол</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="gender" value="male" checked={formData.gender === "male"} onChange={() => setFormData({ ...formData, gender: "male" })} className="w-4 h-4 accent-[#FF0026]" disabled={loading} /> 
                  <span className="text-[var(--text-secondary)]">Мужской</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="gender" value="female" checked={formData.gender === "female"} onChange={() => setFormData({ ...formData, gender: "female" })} className="w-4 h-4 accent-[#FF0026]" disabled={loading} /> 
                  <span className="text-[var(--text-secondary)]">Женский</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium form-label mb-1">Раса</label>
              <select
                value={raceId ?? ''}
                onChange={(e) => setRaceId(e.target.value ? Number(e.target.value) : null)}
                className="w-full form-select"
              >
                <option value="">Нет</option>
                {races.map(race => (
                  <option key={race.id} value={race.id}>{race.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium form-label mb-1">Макс. здоровье</label>
                <input type="number" value={formData.max_health} onChange={(e) => setFormData({ ...formData, max_health: +e.target.value, health: +e.target.value })} className="w-full form-input" disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-medium form-label mb-1">Броня</label>
                <input type="number" value={formData.armor} onChange={(e) => setFormData({ ...formData, armor: +e.target.value })} className="w-full form-input" disabled={loading} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="block text-xs form-label">Сила</label><input type="number" value={formData.strength} onChange={(e) => setFormData({ ...formData, strength: +e.target.value })} className="w-full form-input py-1" disabled={loading} /></div>
              <div><label className="block text-xs form-label">Ловкость</label><input type="number" value={formData.agility} onChange={(e) => setFormData({ ...formData, agility: +e.target.value })} className="w-full form-input py-1" disabled={loading} /></div>
              <div><label className="block text-xs form-label">Интеллект</label><input type="number" value={formData.intelligence} onChange={(e) => setFormData({ ...formData, intelligence: +e.target.value })} className="w-full form-input py-1" disabled={loading} /></div>
              <div><label className="block text-xs form-label">Телосложение</label><input type="number" value={formData.physique} onChange={(e) => setFormData({ ...formData, physique: +e.target.value })} className="w-full form-input py-1" disabled={loading} /></div>
              <div><label className="block text-xs form-label">Мудрость</label><input type="number" value={formData.wisdom} onChange={(e) => setFormData({ ...formData, wisdom: +e.target.value })} className="w-full form-input py-1" disabled={loading} /></div>
              <div><label className="block text-xs form-label">Харизма</label><input type="number" value={formData.charisma} onChange={(e) => setFormData({ ...formData, charisma: +e.target.value })} className="w-full form-input py-1" disabled={loading} /></div>
            </div>
            <div>
              <label className="block text-sm font-medium form-label mb-1">Агрессия</label>
              <select value={formData.aggression} onChange={(e) => setFormData({ ...formData, aggression: +e.target.value as 0|1|2 })} className="w-full form-select" disabled={loading}>
                <option value={0}>Мирный</option>
                <option value={1}>Нейтральный</option>
                <option value={2}>Агрессивный</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium form-label mb-1">История</label>
              <textarea value={formData.history} onChange={(e) => setFormData({ ...formData, history: e.target.value })} className="w-full form-textarea" rows={2} disabled={loading} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
              <button type="button" onClick={onClose} className="px-4 py-2 btn-secondary" disabled={loading}>Отмена</button>
              <button type="submit" disabled={loading} className="px-4 py-2 btn-primary disabled:opacity-50">
                {loading ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
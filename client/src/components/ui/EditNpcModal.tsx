// client/src/components/ui/EditNpcModal.tsx
import { useState, useEffect } from 'react';
import type { NPC, RaceType, EffectType, FullNPCData } from '../../types';
import { useNpcStore } from '../../stores/npcStore';
import { NpcItemsManager } from './NpcItemsManager';
import { NpcAbilitiesManager } from './NpcAbilitiesManager';
import { NpcEffectsManager } from './NpcEffectsManager';
import { useMediaQuery } from './useMediaQuery';
import { useErrorHandler } from '../../hooks/useErrorHandler';

interface EditNpcModalProps {
  npc: NPC;
  onClose: () => void;
  onNpcUpdated: (updatedNpc: NPC) => void;
}

type MainTab = 'stats' | 'items' | 'abilities' | 'effects';

export const EditNpcModal = ({ npc, onClose, onNpcUpdated }: EditNpcModalProps) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { showError } = useErrorHandler();
  const [formData, setFormData] = useState<FullNPCData>(() => ({
    ...npc,
    final_stats: {
      health: npc.health,
      max_health: npc.max_health,
      armor: npc.armor,
      strength: npc.strength,
      agility: npc.agility,
      intelligence: npc.intelligence,
      physique: npc.physique,
      wisdom: npc.wisdom,
      charisma: npc.charisma,
    },
    abilities: [],
    items: [],
    active_effects: [],
  }));
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('stats');
  const [races, setRaces] = useState<RaceType[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedRaceEffects, setSelectedRaceEffects] = useState<EffectType[]>([]);
  const { fetchNpcs } = useNpcStore();

  // Загрузка списка рас
  useEffect(() => {
    fetch('/api/races').then(res => res.json()).then(setRaces);
  }, []);

  // Загрузка эффектов расы при изменении race_id
  useEffect(() => {
    if (formData.race_id) {
      fetch(`/api/races/${formData.race_id}`)
        .then(res => res.json())
        .then(data => setSelectedRaceEffects(data.race?.effects || []))
        .catch(err => {
          console.error('Ошибка загрузки эффектов расы:', err);
          setSelectedRaceEffects([]);
        });
    } else {
      setSelectedRaceEffects([]);
    }
  }, [formData.race_id]);

  // Загрузка полных данных NPC
  useEffect(() => {
    const loadFullNpc = async () => {
      setLoadingDetails(true);
      try {
        const response = await fetch(`/api/npcs/${npc.id}/details`);
        if (!response.ok) throw new Error('Ошибка загрузки');
        const result = await response.json();
        const fullNpc: FullNPCData = result.npc;
        setFormData({
          ...fullNpc,
          abilities: fullNpc.abilities || [],
          items: fullNpc.items || [],
          active_effects: fullNpc.active_effects || []
        });
        if (fullNpc.avatar_url) setAvatarPreview(fullNpc.avatar_url);
      } catch {
        showError('Не удалось загрузить данные NPC');
      } finally {
        setLoadingDetails(false);
      }
    };
    loadFullNpc();
  }, [npc.id, showError]);

  const updateNpcData = async () => {
    try {
      const response = await fetch(`/api/npcs/${npc.id}/details`);
      if (!response.ok) throw new Error();
      const result = await response.json();
      const updated = result.npc;
      setFormData({
        ...updated,
        abilities: updated.abilities || [],
        items: updated.items || [],
        active_effects: updated.active_effects || []
      });
      await fetchNpcs();
    } catch {
      showError('Не удалось обновить данные NPC');
    }
  };

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    const formDataUpload = new FormData();
    formDataUpload.append("avatar", file);
    try {
      const response = await fetch(`/api/npcs/${npc.id}/avatar`, {
        method: "POST",
        body: formDataUpload,
      });
      if (!response.ok) throw new Error("Ошибка загрузки");
      const result = await response.json();
      setAvatarPreview(result.avatarUrl);
      await updateNpcData();
    } catch {
      showError("Не удалось загрузить аватарку");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const deleteAvatar = async () => {
    if (!confirm("Удалить аватарку?")) return;
    try {
      const response = await fetch(`/api/npcs/${npc.id}/avatar`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Ошибка удаления");
      setAvatarPreview(null);
      await updateNpcData();
    } catch {
      showError("Не удалось удалить аватарку");
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAvatar(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { showError('Имя обязательно'); return; }
    if (formData.health > formData.max_health) { showError('Здоровье не может быть больше максимума'); return; }
    setLoading(true);
    try {
      const response = await fetch(`/api/npcs/${npc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          gender: formData.gender,
          health: Number(formData.health),
          max_health: Number(formData.max_health),
          armor: Number(formData.armor),
          strength: Number(formData.strength),
          agility: Number(formData.agility),
          intelligence: Number(formData.intelligence),
          physique: Number(formData.physique),
          wisdom: Number(formData.wisdom),
          charisma: Number(formData.charisma),
          history: formData.history || null,
          is_online: formData.is_online ? 1 : 0,
          is_card_shown: formData.is_card_shown ? 1 : 0,
          aggression: Number(formData.aggression),
          race_id: formData.race_id ?? null,
        })
      });
      if (!response.ok) throw new Error();
      const result = await response.json();
      await fetchNpcs();
      if (result.success) {
        onNpcUpdated(result.npc);
        onClose();
      }
    } catch {
      showError('Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNpc = async () => {
    if (!confirm('Удалить NPC навсегда?')) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/npcs/${npc.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      await fetchNpcs();
      onClose();
    } catch {
      showError('Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  const renderStatsForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Avatar */}
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {avatarPreview ? (
              <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl text-gray-400">👤</span>
            )}
          </div>
          <div className="flex gap-2">
            <label className="cursor-pointer text-sm bg-white px-3 py-1 rounded border text-gray-700">
              Загрузить
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={loading || uploadingAvatar} />
            </label>
            {avatarPreview && (
              <button
                type="button"
                onClick={deleteAvatar}
                disabled={loading || uploadingAvatar}
                className="text-sm bg-red-50 px-3 py-1 rounded border border-red-200 text-red-600 hover:bg-red-100"
              >
                Удалить
              </button>
            )}
          </div>
          {uploadingAvatar && <span className="text-sm text-gray-500">Загрузка...</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Имя NPC *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            required
            maxLength={50}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Пол</label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })}
            className="w-full px-3 py-2 border rounded"
            disabled={loading}
          >
            <option value="male">Мужской</option>
            <option value="female">Женский</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Раса</label>
          <select
            value={formData.race_id || ''}
            onChange={(e) => setFormData({ ...formData, race_id: e.target.value ? Number(e.target.value) : null })}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">Нет</option>
            {races.map(race => (
              <option key={race.id} value={race.id}>{race.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Текущее здоровье</label>
          <input
            type="number"
            value={formData.health}
            onChange={(e) => setFormData({ ...formData, health: parseInt(e.target.value) || 0 })}
            min="0"
            max={formData.max_health}
            className="w-full px-3 py-2 border rounded"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Максимальное здоровье</label>
          <input
            type="number"
            value={formData.max_health}
            onChange={(e) => setFormData({ ...formData, max_health: parseInt(e.target.value) || 1 })}
            min="1"
            className="w-full px-3 py-2 border rounded"
            disabled={loading}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Броня</label>
          <input
            type="number"
            value={formData.armor}
            onChange={(e) => setFormData({ ...formData, armor: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Сила</label>
          <input
            type="number"
            value={formData.strength}
            onChange={(e) => setFormData({ ...formData, strength: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ловкость</label>
          <input
            type="number"
            value={formData.agility}
            onChange={(e) => setFormData({ ...formData, agility: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Интеллект</label>
          <input
            type="number"
            value={formData.intelligence}
            onChange={(e) => setFormData({ ...formData, intelligence: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Телосложение</label>
          <input
            type="number"
            value={formData.physique}
            onChange={(e) => setFormData({ ...formData, physique: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Мудрость</label>
          <input
            type="number"
            value={formData.wisdom}
            onChange={(e) => setFormData({ ...formData, wisdom: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Харизма</label>
          <input
            type="number"
            value={formData.charisma}
            onChange={(e) => setFormData({ ...formData, charisma: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Агрессия</label>
          <select
            value={formData.aggression}
            onChange={(e) => setFormData({ ...formData, aggression: Number(e.target.value) as 0 | 1 | 2 })}
            className="w-full px-3 py-2 border rounded"
            disabled={loading}
          >
            <option value={0}>Мирный</option>
            <option value={1}>Нейтральный</option>
            <option value={2}>Агрессивный</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">История</label>
        <textarea
          value={formData.history || ''}
          onChange={(e) => setFormData({ ...formData, history: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border rounded"
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.is_online}
            onChange={(e) => setFormData({ ...formData, is_online: e.target.checked })}
            disabled={loading}
          />
          <span className="text-sm">В сети</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.is_card_shown}
            onChange={(e) => setFormData({ ...formData, is_card_shown: e.target.checked })}
            disabled={loading}
          />
          <span className="text-sm">Показывать карточку</span>
        </label>
      </div>

      <div className="flex justify-between items-center pt-6 border-t">
        <button
          type="button"
          onClick={handleDeleteNpc}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          disabled={loading || deleting}
        >
          {deleting ? 'Удаление...' : 'Удалить NPC'}
        </button>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50"
            disabled={loading || deleting}
          >
            Отмена
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            disabled={loading || deleting}
          >
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </form>
  );

  const renderRightContent = () => {
    switch (activeMainTab) {
      case 'stats':
        return renderStatsForm();
      case 'items':
        return (
          <NpcItemsManager
            npcId={npc.id}
            items={formData.items || []}
            onDataChanged={updateNpcData}
            showError={showError}
          />
        );
      case 'abilities':
        return (
          <NpcAbilitiesManager
            npcId={npc.id}
            abilities={formData.abilities || []}
            onDataChanged={updateNpcData}
            showError={showError}
          />
        );
      case 'effects': {
        const itemPassiveEffects = (formData.items || []).flatMap(item => item.passive_effects || []);
        const raceName = races.find(r => r.id === formData.race_id)?.name || null;
        return (
          <NpcEffectsManager
            npcId={npc.id}
            activeEffects={formData.active_effects || []}
            raceEffects={selectedRaceEffects}
            raceName={raceName}
            itemPassiveEffects={itemPassiveEffects}
            onDataChanged={updateNpcData}
            showError={showError}
          />
        );
      }
      default:
        return null;
    }
  };

  if (loadingDetails) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-xl w-full max-w-sm text-center">Загрузка данных NPC...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col md:flex-row overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {isMobile ? (
          <div className="border-b border-gray-200 p-3 bg-gray-50">
            <select
              value={activeMainTab}
              onChange={(e) => setActiveMainTab(e.target.value as MainTab)}
              className="w-full py-3 px-4 text-base border rounded-xl bg-white shadow-sm"
            >
              <option value="stats">📋 Основное</option>
              <option value="items">📦 Предметы</option>
              <option value="abilities">✨ Способности</option>
              <option value="effects">🌀 Эффекты</option>
            </select>
          </div>
        ) : (
          <div className="w-56 bg-gray-50 border-r border-gray-200 p-4 flex flex-col gap-2">
            <button
              onClick={() => setActiveMainTab('stats')}
              className={`flex items-center gap-3 px-4 py-2 rounded-xl text-left transition ${activeMainTab === 'stats' ? 'bg-blue-500 text-white shadow' : 'hover:bg-gray-100 text-gray-700'}`}
            >
              <span className="text-xl">📋</span> Основное
            </button>
            <button
              onClick={() => setActiveMainTab('items')}
              className={`flex items-center gap-3 px-4 py-2 rounded-xl text-left transition ${activeMainTab === 'items' ? 'bg-blue-500 text-white shadow' : 'hover:bg-gray-100 text-gray-700'}`}
            >
              <span className="text-xl">📦</span> Предметы
            </button>
            <button
              onClick={() => setActiveMainTab('abilities')}
              className={`flex items-center gap-3 px-4 py-2 rounded-xl text-left transition ${activeMainTab === 'abilities' ? 'bg-blue-500 text-white shadow' : 'hover:bg-gray-100 text-gray-700'}`}
            >
              <span className="text-xl">✨</span> Способности
            </button>
            <button
              onClick={() => setActiveMainTab('effects')}
              className={`flex items-center gap-3 px-4 py-2 rounded-xl text-left transition ${activeMainTab === 'effects' ? 'bg-blue-500 text-white shadow' : 'hover:bg-gray-100 text-gray-700'}`}
            >
              <span className="text-xl">🌀</span> Эффекты
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {renderRightContent()}
        </div>
      </div>
    </div>
  );
};
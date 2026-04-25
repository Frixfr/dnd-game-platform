// client/src/components/ui/EditNpcModal.tsx
import { useState, useEffect } from 'react';
import type { NpcType, RaceType, EffectType, FullNPCData } from '../../types';
import { useNpcStore } from '../../stores/npcStore';
import { NpcItemsManager } from './NpcItemsManager';
import { NpcAbilitiesManager } from './NpcAbilitiesManager';
import { NpcEffectsManager } from './NpcEffectsManager';
import { NpcStatsForm } from './NpcStatsForm';
import { useMediaQuery } from './useMediaQuery';
import { useErrorHandler } from '../../hooks/useErrorHandler';

interface EditNpcModalProps {
  npc: NpcType;
  onClose: () => void;
  onNpcUpdated: (updatedNpc: NpcType) => void;
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
    fetch('/api/races')
      .then(res => res.json())
      .then(setRaces)
      .catch(() => showError('Не удалось загрузить список рас'));
  }, [showError]);

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

  // Функция обновления только основных полей NPC (без abilities, items, active_effects)
  const updateNpcFormData = (newNpcData: NpcType) => {
    setFormData((prev) => ({
      ...prev,
      ...newNpcData,
      abilities: prev.abilities,
      items: prev.items,
      active_effects: prev.active_effects,
      final_stats: {
        health: newNpcData.health,
        max_health: newNpcData.max_health,
        armor: newNpcData.armor,
        strength: newNpcData.strength,
        agility: newNpcData.agility,
        intelligence: newNpcData.intelligence,
        physique: newNpcData.physique,
        wisdom: newNpcData.wisdom,
        charisma: newNpcData.charisma,
      },
    }));
  };

  const renderRightContent = () => {
    switch (activeMainTab) {
      case 'stats':
        return (
          <NpcStatsForm
            formData={formData as NpcType}
            setFormData={updateNpcFormData}
            races={races}
            loading={loading}
            uploadingAvatar={uploadingAvatar}
            avatarPreview={avatarPreview}
            onAvatarChange={handleAvatarChange}
            onAvatarDelete={deleteAvatar}
            onSubmit={handleSubmit}
            onDelete={handleDeleteNpc}
            deleting={deleting}
          />
        );
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
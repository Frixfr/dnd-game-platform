// client/src/components/ui/EditPlayerModal.tsx
import { useState, useEffect } from 'react';
import type { PlayerType, RaceType, EffectType } from '../../types';
import { usePlayerStore } from '../../stores/playerStore';
import { PlayerStatsForm } from './PlayerStatsForm';
import { PlayerItemsManager } from './PlayerItemsManager';
import { PlayerAbilitiesManager } from './PlayerAbilitiesManager';
import { PlayerEffectsManager } from './PlayerEffectsManager';
import { useMediaQuery } from './useMediaQuery';
import { useErrorHandler } from '../../hooks/useErrorHandler';

interface EditPlayerModalProps {
  player: PlayerType;
  onClose: () => void;
  onPlayerUpdated: (updatedPlayer: PlayerType) => void;
}

type MainTab = 'stats' | 'items' | 'abilities' | 'effects';

export const EditPlayerModal = ({ player, onClose, onPlayerUpdated }: EditPlayerModalProps) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { showError } = useErrorHandler();
  const [formData, setFormData] = useState<PlayerType>(() => ({
    ...player,
    items: [],
    abilities: [],
    active_effects: []
  }));
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('stats');
  const [races, setRaces] = useState<RaceType[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedRaceEffects, setSelectedRaceEffects] = useState<EffectType[]>([]);
  const { fetchPlayers } = usePlayerStore();

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

  // Загрузка полных данных игрока
  useEffect(() => {
    const loadFullPlayer = async () => {
      setLoadingDetails(true);
      try {
        const response = await fetch(`/api/players/${player.id}/details`);
        if (!response.ok) throw new Error('Ошибка загрузки');
        const fullPlayer = await response.json();
        setFormData({
          ...fullPlayer,
          items: fullPlayer.items || [],
          abilities: fullPlayer.abilities || [],
          active_effects: fullPlayer.active_effects || []
        });
        if (fullPlayer.avatar_url) setAvatarPreview(fullPlayer.avatar_url);
      } catch {
        showError('Не удалось загрузить данные игрока');
      } finally {
        setLoadingDetails(false);
      }
    };
    loadFullPlayer();
  }, [player.id, showError]); // добавлена зависимость showError

  const updatePlayerData = async () => {
    try {
      const response = await fetch(`/api/players/${player.id}/details`);
      if (!response.ok) throw new Error();
      const updated = await response.json();
      setFormData({
        ...updated,
        items: updated.items || [],
        abilities: updated.abilities || [],
        active_effects: updated.active_effects || []
      });
      await fetchPlayers();
    } catch {
      showError('Не удалось обновить данные игрока');
    }
  };

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    const formDataUpload = new FormData();
    formDataUpload.append("avatar", file);
    try {
      const response = await fetch(`/api/players/${player.id}/avatar`, {
        method: "POST",
        body: formDataUpload,
      });
      if (!response.ok) throw new Error("Ошибка загрузки");
      const result = await response.json();
      setAvatarPreview(result.avatarUrl);
      await updatePlayerData();
    } catch {
      showError("Не удалось загрузить аватарку");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const deleteAvatar = async () => {
    if (!confirm("Удалить аватарку?")) return;
    try {
      const response = await fetch(`/api/players/${player.id}/avatar`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Ошибка удаления");
      setAvatarPreview(null);
      await updatePlayerData();
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
      const response = await fetch(`/api/players/${player.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error();
      const result = await response.json();
      await fetchPlayers();
      if (result.success) {
        onPlayerUpdated(result.player);
        onClose();
      }
    } catch {
      showError('Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlayer = async () => {
    if (!confirm('Удалить игрока навсегда?')) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/players/${player.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      await fetchPlayers();
      onClose();
    } catch {
      showError('Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  const renderRightContent = () => {
    switch (activeMainTab) {
      case 'stats':
        return (
          <PlayerStatsForm
            formData={formData}
            setFormData={setFormData}
            races={races}
            loading={loading}
            uploadingAvatar={uploadingAvatar}
            avatarPreview={avatarPreview}
            onAvatarChange={handleAvatarChange}
            onAvatarDelete={deleteAvatar}
            onSubmit={handleSubmit}
            onDelete={handleDeletePlayer}
            deleting={deleting}
          />
        );
      case 'items':
        return (
          <PlayerItemsManager
            playerId={player.id}
            items={formData.items}
            onDataChanged={updatePlayerData}
            showError={showError}
          />
        );
      case 'abilities':
        return (
          <PlayerAbilitiesManager
            playerId={player.id}
            abilities={formData.abilities}
            onDataChanged={updatePlayerData}
            showError={showError}
          />
        );
      case 'effects':
        return (
          <PlayerEffectsManager
            playerId={player.id}
            activeEffects={formData.active_effects}
            raceEffects={selectedRaceEffects}
            onDataChanged={updatePlayerData}
            showError={showError}
          />
        );
      default:
        return null;
    }
  };

  if (loadingDetails) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-xl w-full max-w-sm text-center">Загрузка данных игрока...</div>
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
          <div className="w-56 bg-gray-50 border-r border-gray-200 p-4 flex-col gap-2">
            <button onClick={() => setActiveMainTab('stats')} className={`flex items-center gap-3 px-4 py-2 rounded-xl text-left transition ${activeMainTab === 'stats' ? 'bg-blue-500 text-white shadow' : 'hover:bg-gray-100 text-gray-700'}`}><span className="text-xl">📋</span> Основное</button>
            <button onClick={() => setActiveMainTab('items')} className={`flex items-center gap-3 px-4 py-2 rounded-xl text-left transition ${activeMainTab === 'items' ? 'bg-blue-500 text-white shadow' : 'hover:bg-gray-100 text-gray-700'}`}><span className="text-xl">📦</span> Предметы</button>
            <button onClick={() => setActiveMainTab('abilities')} className={`flex items-center gap-3 px-4 py-2 rounded-xl text-left transition ${activeMainTab === 'abilities' ? 'bg-blue-500 text-white shadow' : 'hover:bg-gray-100 text-gray-700'}`}><span className="text-xl">✨</span> Способности</button>
            <button onClick={() => setActiveMainTab('effects')} className={`flex items-center gap-3 px-4 py-2 rounded-xl text-left transition ${activeMainTab === 'effects' ? 'bg-blue-500 text-white shadow' : 'hover:bg-gray-100 text-gray-700'}`}><span className="text-xl">🌀</span> Эффекты</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {renderRightContent()}
        </div>
      </div>
    </div>
  );
};
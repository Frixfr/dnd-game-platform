// client/src/components/ui/EditPlayerModal.tsx
import { useState, useEffect, useCallback } from 'react';
import type { PlayerType, ItemType, AbilityType, EffectType } from '../../types';
import { usePlayerStore } from '../../stores/playerStore';

interface EditPlayerModalProps {
  player: PlayerType;
  onClose: () => void;
  onPlayerUpdated: (updatedPlayer: PlayerType) => void;
}

type MainTab = 'stats' | 'items' | 'abilities' | 'effects';
type ItemsSubTab = 'list' | 'add';
type AbilitiesSubTab = 'list' | 'add';
type EffectsSubTab = 'list' | 'add';

const statFields = ['strength', 'agility', 'intelligence', 'physique', 'wisdom', 'charisma'] as const;

export const EditPlayerModal = ({ player, onClose, onPlayerUpdated }: EditPlayerModalProps) => {
  const [formData, setFormData] = useState<PlayerType>(() => ({
    ...player,
    items: [],
    abilities: [],
    active_effects: []
  }));
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('stats');
  
  // Под-вкладки
  const [itemsSubTab, setItemsSubTab] = useState<ItemsSubTab>('list');
  const [abilitiesSubTab, setAbilitiesSubTab] = useState<AbilitiesSubTab>('list');
  const [effectsSubTab, setEffectsSubTab] = useState<EffectsSubTab>('list');
  
  // Списки всех объектов
  const [allItems, setAllItems] = useState<ItemType[]>([]);
  const [allAbilities, setAllAbilities] = useState<AbilityType[]>([]);
  const [allEffects, setAllEffects] = useState<EffectType[]>([]);
  
  const [itemsLoading, setItemsLoading] = useState(false);
  const [abilitiesLoading, setAbilitiesLoading] = useState(false);
  const [effectsLoading, setEffectsLoading] = useState(false);
  
  const [selectedItems, setSelectedItems] = useState<{ [key: number]: number }>({});
  const [selectedAbilities, setSelectedAbilities] = useState<number[]>([]);
  const [selectedEffects, setSelectedEffects] = useState<number[]>([]);
  
  const [equipStatus, setEquipStatus] = useState<{ [key: number]: boolean }>({});
  const [deleting, setDeleting] = useState(false);
  
  // Поиск
  const [itemSearch, setItemSearch] = useState('');
  const [abilitySearch, setAbilitySearch] = useState('');
  const [effectSearch, setEffectSearch] = useState('');
  
  // Раса и аватар (пока локально)
  const [race, setRace] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const { fetchPlayers } = usePlayerStore();

  // Загрузка полных данных игрока
  useEffect(() => {
    const loadFullPlayer = async () => {
      setLoadingDetails(true);
      try {
        const response = await fetch(`http://localhost:5000/api/players/${player.id}/details`);
        if (!response.ok) throw new Error('Ошибка загрузки');
        const fullPlayer = await response.json();
        setFormData({
          ...fullPlayer,
          items: fullPlayer.items || [],
          abilities: fullPlayer.abilities || [],
          active_effects: fullPlayer.active_effects || []
        });
        const initialEquipStatus: { [key: number]: boolean } = {};
        (fullPlayer.items || []).forEach((item: ItemType) => {
          initialEquipStatus[item.id] = item.is_equipped === 1;
        });
        setEquipStatus(initialEquipStatus);
        // В будущем: если у игрока есть avatar, загрузить его
      } catch {
        setError('Не удалось загрузить данные игрока');
      } finally {
        setLoadingDetails(false);
      }
    };
    loadFullPlayer();
  }, [player.id]);

  // Загрузка списков предметов, способностей, эффектов
  const loadAllItems = useCallback(async () => {
    setItemsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/items');
      if (!response.ok) throw new Error();
      setAllItems(await response.json());
    } catch {
      setError('Не удалось загрузить предметы');
    } finally {
      setItemsLoading(false);
    }
  }, []);

  const loadAllAbilities = useCallback(async () => {
    setAbilitiesLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/abilities');
      if (!response.ok) throw new Error();
      setAllAbilities(await response.json());
    } catch {
      setError('Не удалось загрузить способности');
    } finally {
      setAbilitiesLoading(false);
    }
  }, []);

  const loadAllEffects = useCallback(async () => {
    setEffectsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/effects');
      if (!response.ok) throw new Error();
      setAllEffects(await response.json());
    } catch {
      setError('Не удалось загрузить эффекты');
    } finally {
      setEffectsLoading(false);
    }
  }, []);

  // При переключении на под-вкладку добавления подгружаем данные
  useEffect(() => {
    if (activeMainTab === 'items' && itemsSubTab === 'add') loadAllItems();
    if (activeMainTab === 'abilities' && abilitiesSubTab === 'add') loadAllAbilities();
    if (activeMainTab === 'effects' && effectsSubTab === 'add') loadAllEffects();
  }, [activeMainTab, itemsSubTab, abilitiesSubTab, effectsSubTab, loadAllItems, loadAllAbilities, loadAllEffects]);

  const updatePlayerData = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/players/${player.id}/details`);
      if (!response.ok) throw new Error();
      const updated = await response.json();
      setFormData({
        ...updated,
        items: updated.items || [],
        abilities: updated.abilities || [],
        active_effects: updated.active_effects || []
      });
      await fetchPlayers();
    } catch (err) {
      console.error(err);
    }
  };

  // --- Обработчики форм ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const numericFields = ['health', 'max_health', 'armor', 'strength', 'agility', 'intelligence', 'physique', 'wisdom', 'charisma'];
    if (numericFields.includes(name)) {
      setFormData({ ...formData, [name]: value === '' ? 0 : parseInt(value, 10) || 0 });
    } else if (type === 'checkbox') {
      setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Обработчик загрузки аватарки
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Предметы
  const handleEquipToggle = async (itemId: number) => {
    const newStatus = !equipStatus[itemId];
    try {
      const response = await fetch(`http://localhost:5000/api/players/${player.id}/items/${itemId}/equip`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_equipped: newStatus })
      });
      if (!response.ok) throw new Error();
      setEquipStatus(prev => ({ ...prev, [itemId]: newStatus }));
      await updatePlayerData();
    } catch {
      setError('Не удалось изменить экипировку');
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!confirm('Удалить предмет?')) return;
    try {
      await fetch(`http://localhost:5000/api/players/${player.id}/items/${itemId}`, { method: 'DELETE' });
      await updatePlayerData();
    } catch {
      setError('Ошибка удаления');
    }
  };

  const handleAddItems = async () => {
    const itemsToAdd = Object.entries(selectedItems).map(([id, qty]) => ({ item_id: parseInt(id), quantity: qty }));
    if (itemsToAdd.length === 0) { setError('Выберите предметы'); return; }
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/players/${player.id}/items/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToAdd })
      });
      if (!response.ok) throw new Error();
      setSelectedItems({});
      await updatePlayerData();
      setItemsSubTab('list');
    } catch {
      setError('Ошибка добавления');
    } finally {
      setLoading(false);
    }
  };

  // Способности
  const handleToggleAbilityActive = async (abilityId: number) => {
    const ability = formData.abilities?.find(a => a.id === abilityId);
    if (!ability) return;
    try {
      await fetch(`http://localhost:5000/api/players/${player.id}/abilities/${abilityId}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: ability.is_active === 1 ? 0 : 1 })
      });
      await updatePlayerData();
    } catch {
      setError('Ошибка изменения активности');
    }
  };

  const handleRemoveAbility = async (abilityId: number) => {
    if (!confirm('Удалить способность?')) return;
    try {
      await fetch(`http://localhost:5000/api/players/${player.id}/abilities/${abilityId}`, { method: 'DELETE' });
      await updatePlayerData();
    } catch {
      setError('Ошибка удаления');
    }
  };

  const handleAddAbilities = async () => {
    if (selectedAbilities.length === 0) { setError('Выберите способности'); return; }
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/players/${player.id}/abilities/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ability_ids: selectedAbilities })
      });
      if (!response.ok) throw new Error();
      setSelectedAbilities([]);
      await updatePlayerData();
      setAbilitiesSubTab('list');
    } catch {
      setError('Ошибка добавления');
    } finally {
      setLoading(false);
    }
  };

  // Эффекты
  const handleRemoveEffect = async (effectId: number) => {
    if (!confirm('Удалить эффект?')) return;
    try {
      await fetch(`http://localhost:5000/api/players/${player.id}/effects/${effectId}`, { method: 'DELETE' });
      await updatePlayerData();
    } catch {
      setError('Ошибка удаления');
    }
  };

  const handleAddEffects = async () => {
    if (selectedEffects.length === 0) { setError('Выберите эффекты'); return; }
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/players/${player.id}/effects/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ effect_ids: selectedEffects })
      });
      if (!response.ok) throw new Error();
      setSelectedEffects([]);
      await updatePlayerData();
      setEffectsSubTab('list');
    } catch {
      setError('Ошибка добавления');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { setError('Имя обязательно'); return; }
    if (formData.health > formData.max_health) { setError('Здоровье не может быть больше максимума'); return; }
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/players/${player.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error();
      const result = await response.json();
      await fetchPlayers();
      if (result.success) {
        // В будущем: если avatarPreview сохранён, отправить отдельным запросом
        onPlayerUpdated(result.player);
        onClose();
      }
    } catch {
      setError('Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlayer = async () => {
    if (!confirm('Удалить игрока навсегда?')) return;
    setDeleting(true);
    try {
      const response = await fetch(`http://localhost:5000/api/players/${player.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      await fetchPlayers();
      onClose();
    } catch {
      setError('Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  // --- Рендеры ---
  const renderStatsForm = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Персона (с аватаркой и расой) */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center gap-2">🧑‍🎤 Персона</h3>
        <div className="flex gap-6">
          {/* Аватарка */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl text-gray-400">👤</span>
              )}
            </div>
            <label className="cursor-pointer text-xs bg-white px-2 py-1 rounded border text-gray-600 hover:bg-gray-50">
              Загрузить
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={loading} />
            </label>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Имя *</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-xl" required disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Пол</label>
              <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-xl" disabled={loading}>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Раса (опционально)</label>
              <input type="text" value={race} onChange={(e) => setRace(e.target.value)} placeholder="Эльф, Дварф..." className="w-full px-3 py-2 border rounded-xl" disabled={loading} />
              <p className="text-xs text-gray-400 mt-1">Пока не сохраняется</p>
            </div>
          </div>
        </div>
      </div>

      {/* Защита (улучшенный вариант 1) */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center gap-2">🛡️ Защита и здоровье</h3>
        <div className="mb-5">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>❤️ Здоровье</span>
            <span className="font-medium">{formData.health} / {formData.max_health}</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-300" style={{ width: `${(formData.health / formData.max_health) * 100}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Текущее здоровье</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500">❤️</span>
              <input type="number" name="health" value={formData.health} onChange={handleInputChange} min="0" max={formData.max_health} className="w-full pl-8 pr-3 py-2 border rounded-xl" disabled={loading} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Макс. здоровье</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400">❤️</span>
              <input type="number" name="max_health" value={formData.max_health} onChange={handleInputChange} min="1" className="w-full pl-8 pr-3 py-2 border rounded-xl" disabled={loading} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Класс брони (AC)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500">🛡️</span>
              <input type="number" name="armor" value={formData.armor} onChange={handleInputChange} min="0" className="w-full pl-8 pr-3 py-2 border rounded-xl" disabled={loading} />
            </div>
          </div>
        </div>
      </div>

      {/* Характеристики */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <h3 className="text-md font-semibold text-gray-700 mb-3">⚔️ Характеристики</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {statFields.map(stat => {
            const labels: Record<string, string> = {
              strength: 'Сила (STR)', agility: 'Ловкость (DEX)', intelligence: 'Интеллект (INT)',
              physique: 'Телосложение (CON)', wisdom: 'Мудрость (WIS)', charisma: 'Харизма (CHA)'
            };
            return (
              <div key={stat}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{labels[stat]}</label>
                <input type="number" name={stat} value={formData[stat]} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-xl" disabled={loading} />
              </div>
            );
          })}
        </div>
      </div>

      {/* История */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <h3 className="text-md font-semibold text-gray-700 mb-3">📜 История</h3>
        <textarea name="history" rows={4} value={formData.history || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-xl resize-none" disabled={loading} />
      </div>

      {/* Статусы */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <h3 className="text-md font-semibold text-gray-700 mb-3">🏷️ Статусы</h3>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2"><input type="checkbox" name="in_battle" checked={formData.in_battle} onChange={handleInputChange} className="w-4 h-4" disabled={loading} />⚔️ В бою</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="is_online" checked={formData.is_online} onChange={handleInputChange} className="w-4 h-4" disabled={loading} />🟢 Онлайн</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="is_card_shown" checked={formData.is_card_shown} onChange={handleInputChange} className="w-4 h-4" disabled={loading} />🃏 Показывать карточку</label>
        </div>
      </div>

      {/* Кнопки */}
      <div className="flex justify-between items-center pt-4 border-t">
        <button type="button" onClick={handleDeletePlayer} className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50" disabled={loading || deleting}>
          {deleting ? 'Удаление...' : '🗑️ Удалить игрока'}
        </button>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl hover:bg-gray-50" disabled={loading}>Отмена</button>
          <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600" disabled={loading}>{loading ? 'Сохранение...' : '💾 Сохранить'}</button>
        </div>
      </div>
    </form>
  );

  // Рендер предметов (список)
  const renderCurrentItems = () => {
    const items = formData.items || [];
    if (!items.length) return <p className="text-center text-gray-500 py-8">📦 Нет предметов</p>;
    return (
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        {items.map(item => (
          <div key={item.id} className="bg-gray-50 rounded-xl p-4 border">
            <div className="flex justify-between items-start">
              <div><h4 className="font-semibold">{item.name}</h4><p className="text-sm text-gray-500">{item.description}</p><div className="flex gap-2 mt-2"><span className="text-xs bg-white px-2 py-0.5 rounded-full">{item.rarity}</span><span className="text-xs bg-white px-2 py-0.5 rounded-full">×{item.quantity}</span></div></div>
              <div className="flex flex-col items-end gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={equipStatus[item.id] || false} onChange={() => handleEquipToggle(item.id)} />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-green-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                  <span className="ml-2 text-sm">Экип.</span>
                </label>
                <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 text-sm">🗑️ Удалить</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Рендер добавления предметов
  const renderAddItems = () => {
    const filtered = allItems.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase()));
    const ownedIds = new Set((formData.items || []).map(i => i.id));
    return (
      <div className="space-y-4">
        <input type="text" placeholder="🔍 Поиск предметов..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
        {itemsLoading ? <p>Загрузка...</p> : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {filtered.map(item => {
              const owned = ownedIds.has(item.id);
              const qty = selectedItems[item.id] || 1;
              return (
                <div key={item.id} className="bg-gray-50 p-3 rounded-xl flex justify-between items-center">
                  <div><p className="font-medium">{item.name}</p><p className="text-xs text-gray-500">{item.rarity}</p></div>
                  {!owned ? (
                    <div className="flex items-center gap-2">
                      <input type="number" min={1} value={qty} onChange={e => setSelectedItems(prev => ({ ...prev, [item.id]: parseInt(e.target.value) || 1 }))} className="w-16 px-2 py-1 border rounded" />
                      <button onClick={() => setSelectedItems(prev => ({ ...prev, [item.id]: (prev[item.id] || 1) }))} className="px-3 py-1 bg-blue-100 rounded-xl">➕ Добавить</button>
                    </div>
                  ) : <span className="text-green-600 text-sm">✓ Уже есть</span>}
                </div>
              );
            })}
          </div>
        )}
        <div className="pt-2 flex justify-between items-center border-t">
          <span>Выбрано: {Object.keys(selectedItems).length}</span>
          <button onClick={handleAddItems} disabled={Object.keys(selectedItems).length === 0 || loading} className="px-4 py-2 bg-green-500 text-white rounded-xl">Добавить выбранные</button>
        </div>
        <button onClick={() => setItemsSubTab('list')} className="mt-2 text-sm text-gray-500 hover:text-gray-700">← Назад к списку</button>
      </div>
    );
  };

  // Рендер способностей (список)
  const renderCurrentAbilities = () => {
    const abilities = formData.abilities || [];
    if (!abilities.length) return <p className="text-center text-gray-500 py-8">✨ Нет способностей</p>;
    return (
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {abilities.map(ability => (
          <div key={ability.id} className="bg-gray-50 rounded-xl p-4 border">
            <div className="flex justify-between items-start">
              <div><h4 className="font-semibold">{ability.name}</h4><p className="text-sm text-gray-500">{ability.description}</p><div className="flex gap-2 mt-1"><span className="text-xs bg-white px-2 py-0.5 rounded-full">{ability.ability_type}</span>{ability.cooldown_turns > 0 && <span className="text-xs bg-white px-2 py-0.5 rounded-full">Перезарядка: {ability.cooldown_turns}</span>}</div></div>
              <div className="flex flex-col items-end gap-2">
                <button onClick={() => handleToggleAbilityActive(ability.id)} className={`text-sm px-3 py-1 rounded-full ${ability.is_active === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>{ability.is_active === 1 ? 'Активна' : 'Неактивна'}</button>
                <button onClick={() => handleRemoveAbility(ability.id)} className="text-red-500 text-sm">Удалить</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAddAbilities = () => {
    const filtered = allAbilities.filter(a => a.name.toLowerCase().includes(abilitySearch.toLowerCase()));
    const ownedIds = new Set((formData.abilities || []).map(a => a.id));
    return (
      <div className="space-y-4">
        <input type="text" placeholder="🔍 Поиск способностей..." value={abilitySearch} onChange={e => setAbilitySearch(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
        {abilitiesLoading ? <p>Загрузка...</p> : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {filtered.map(ability => {
              const owned = ownedIds.has(ability.id);
              return (
                <div key={ability.id} className="bg-gray-50 p-3 rounded-xl flex justify-between items-center">
                  <div><p className="font-medium">{ability.name}</p><p className="text-xs text-gray-500">{ability.ability_type}</p></div>
                  {!owned ? (
                    <button onClick={() => setSelectedAbilities(prev => prev.includes(ability.id) ? prev.filter(id => id !== ability.id) : [...prev, ability.id])} className={`px-3 py-1 rounded-xl ${selectedAbilities.includes(ability.id) ? 'bg-green-500 text-white' : 'bg-blue-100'}`}>{selectedAbilities.includes(ability.id) ? '✓ Выбрана' : 'Выбрать'}</button>
                  ) : <span className="text-green-600 text-sm">✓ Уже есть</span>}
                </div>
              );
            })}
          </div>
        )}
        <div className="pt-2 flex justify-between items-center border-t">
          <span>Выбрано: {selectedAbilities.length}</span>
          <button onClick={handleAddAbilities} disabled={selectedAbilities.length === 0 || loading} className="px-4 py-2 bg-green-500 text-white rounded-xl">Добавить выбранные</button>
        </div>
        <button onClick={() => setAbilitiesSubTab('list')} className="mt-2 text-sm text-gray-500 hover:text-gray-700">← Назад к списку</button>
      </div>
    );
  };

  const renderCurrentEffects = () => {
    const effects = formData.active_effects || [];
    if (!effects.length) return <p className="text-center text-gray-500 py-8">🌀 Нет эффектов</p>;
    return (
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {effects.map(effect => (
          <div key={effect.id} className="bg-gray-50 rounded-xl p-4 border">
            <div className="flex justify-between">
              <div><h4 className="font-semibold">{effect.name}</h4><p className="text-sm text-gray-500">{effect.description}</p><div className="flex gap-2 mt-1"><span className="text-xs bg-white px-2 py-0.5 rounded-full">{effect.attribute}: {effect.modifier > 0 ? `+${effect.modifier}` : effect.modifier}</span>{effect.duration_turns && <span className="text-xs bg-white px-2 py-0.5 rounded-full">{effect.duration_turns} ходов</span>}</div></div>
              <button onClick={() => handleRemoveEffect(effect.id)} className="text-red-500 text-sm">Удалить</button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAddEffects = () => {
    const filtered = allEffects.filter(e => e.name.toLowerCase().includes(effectSearch.toLowerCase()));
    const ownedIds = new Set((formData.active_effects || []).map(e => e.id));
    return (
      <div className="space-y-4">
        <input type="text" placeholder="🔍 Поиск эффектов..." value={effectSearch} onChange={e => setEffectSearch(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
        {effectsLoading ? <p>Загрузка...</p> : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {filtered.map(effect => {
              const owned = ownedIds.has(effect.id);
              return (
                <div key={effect.id} className="bg-gray-50 p-3 rounded-xl flex justify-between items-center">
                  <div><p className="font-medium">{effect.name}</p><p className="text-xs text-gray-500">{effect.attribute} {effect.modifier > 0 ? `+${effect.modifier}` : effect.modifier}</p></div>
                  {!owned ? (
                    <button onClick={() => setSelectedEffects(prev => prev.includes(effect.id) ? prev.filter(id => id !== effect.id) : [...prev, effect.id])} className={`px-3 py-1 rounded-xl ${selectedEffects.includes(effect.id) ? 'bg-green-500 text-white' : 'bg-blue-100'}`}>{selectedEffects.includes(effect.id) ? '✓ Выбран' : 'Выбрать'}</button>
                  ) : <span className="text-green-600 text-sm">✓ Уже есть</span>}
                </div>
              );
            })}
          </div>
        )}
        <div className="pt-2 flex justify-between items-center border-t">
          <span>Выбрано: {selectedEffects.length}</span>
          <button onClick={handleAddEffects} disabled={selectedEffects.length === 0 || loading} className="px-4 py-2 bg-green-500 text-white rounded-xl">Добавить выбранные</button>
        </div>
        <button onClick={() => setEffectsSubTab('list')} className="mt-2 text-sm text-gray-500 hover:text-gray-700">← Назад к списку</button>
      </div>
    );
  };

  const renderRightContent = () => {
    switch (activeMainTab) {
      case 'stats':
        return renderStatsForm();
      case 'items':
        return itemsSubTab === 'list' ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">📦 Предметы игрока</h3>
              <button onClick={() => { setItemsSubTab('add'); setSelectedItems({}); }} className="px-3 py-1 bg-green-100 text-green-700 rounded-xl text-sm hover:bg-green-200">➕ Добавить предмет</button>
            </div>
            {renderCurrentItems()}
          </div>
        ) : renderAddItems();
      case 'abilities':
        return abilitiesSubTab === 'list' ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">✨ Способности игрока</h3>
              <button onClick={() => { setAbilitiesSubTab('add'); setSelectedAbilities([]); }} className="px-3 py-1 bg-green-100 text-green-700 rounded-xl text-sm hover:bg-green-200">➕ Добавить способность</button>
            </div>
            {renderCurrentAbilities()}
          </div>
        ) : renderAddAbilities();
      case 'effects':
        return effectsSubTab === 'list' ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">🌀 Активные эффекты</h3>
              <button onClick={() => { setEffectsSubTab('add'); setSelectedEffects([]); }} className="px-3 py-1 bg-green-100 text-green-700 rounded-xl text-sm hover:bg-green-200">➕ Добавить эффект</button>
            </div>
            {renderCurrentEffects()}
          </div>
        ) : renderAddEffects();
      default:
        return null;
    }
  };

  if (loadingDetails) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-xl">Загрузка данных игрока...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex overflow-hidden">
        {/* Левая боковая панель */}
        <div className="w-56 bg-gray-50 border-r border-gray-200 p-4 flex flex-col gap-2">
          <button onClick={() => setActiveMainTab('stats')} className={`flex items-center gap-3 px-4 py-2 rounded-xl text-left transition ${activeMainTab === 'stats' ? 'bg-blue-500 text-white shadow' : 'hover:bg-gray-100 text-gray-700'}`}>
            <span className="text-xl">📋</span> Основное
          </button>
          <button onClick={() => setActiveMainTab('items')} className={`flex items-center gap-3 px-4 py-2 rounded-xl text-left transition ${activeMainTab === 'items' ? 'bg-blue-500 text-white shadow' : 'hover:bg-gray-100 text-gray-700'}`}>
            <span className="text-xl">📦</span> Предметы
          </button>
          <button onClick={() => setActiveMainTab('abilities')} className={`flex items-center gap-3 px-4 py-2 rounded-xl text-left transition ${activeMainTab === 'abilities' ? 'bg-blue-500 text-white shadow' : 'hover:bg-gray-100 text-gray-700'}`}>
            <span className="text-xl">✨</span> Способности
          </button>
          <button onClick={() => setActiveMainTab('effects')} className={`flex items-center gap-3 px-4 py-2 rounded-xl text-left transition ${activeMainTab === 'effects' ? 'bg-blue-500 text-white shadow' : 'hover:bg-gray-100 text-gray-700'}`}>
            <span className="text-xl">🌀</span> Эффекты
          </button>
        </div>

        {/* Правая область */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl">{error}</div>}
          {renderRightContent()}
        </div>
      </div>
    </div>
  );
};
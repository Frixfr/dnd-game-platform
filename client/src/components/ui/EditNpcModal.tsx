import { useState, useEffect, useCallback } from 'react';
import type { NpcType, ItemType, AbilityType, EffectType } from '../../types';
import { useNpcStore } from '../../stores/npcStore';

interface EditNpcModalProps {
  npc: NpcType;
  onClose: () => void;
  onNpcUpdated: (updatedNpc: NpcType) => void;
}

type AllItemType = ItemType & { inInventory?: boolean };
type AllAbilityType = AbilityType & { inAbilities?: boolean };
type AllEffectType = EffectType & { inEffects?: boolean };

export const EditNpcModal = ({ npc, onClose, onNpcUpdated }: EditNpcModalProps) => {
  const [formData, setFormData] = useState<NpcType>(() => ({
    ...npc,
    items: [],
    abilities: [],
    active_effects: []
  }));
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'currentItems' | 'addItems' | 'currentAbilities' | 'addAbilities' | 'currentEffects' | 'addEffects'>('stats');
  
  const [allItems, setAllItems] = useState<AllItemType[]>([]);
  const [allAbilities, setAllAbilities] = useState<AllAbilityType[]>([]);
  const [allEffects, setAllEffects] = useState<AllEffectType[]>([]);
  
  const [itemsLoading, setItemsLoading] = useState(false);
  const [abilitiesLoading, setAbilitiesLoading] = useState(false);
  const [effectsLoading, setEffectsLoading] = useState(false);
  
  const [selectedItems, setSelectedItems] = useState<{ [key: number]: number }>({});
  const [selectedAbilities, setSelectedAbilities] = useState<number[]>([]);
  const [selectedEffects, setSelectedEffects] = useState<number[]>([]);
  
  const [equipStatus, setEquipStatus] = useState<{ [key: number]: boolean }>({});
  const [deleting, setDeleting] = useState(false);
  
  const { fetchNpcs } = useNpcStore();

  // Загрузка полных данных NPC
  useEffect(() => {
    const loadFullNpc = async () => {
      setLoadingDetails(true);
      try {
        const response = await fetch(`http://localhost:5000/api/npcs/${npc.id}/details`);
        if (!response.ok) throw new Error('Ошибка загрузки полных данных');
        const data = await response.json();
        const fullNpc = data.npc;
        setFormData({
          ...fullNpc,
          items: fullNpc.items || [],
          abilities: fullNpc.abilities || [],
          active_effects: fullNpc.active_effects || []
        });
        const initialEquipStatus: { [key: number]: boolean } = {};
        (fullNpc.items || []).forEach((item: ItemType) => {
          initialEquipStatus[item.id] = item.is_equipped === 1;
        });
        setEquipStatus(initialEquipStatus);
      } catch (err) {
        console.error('Ошибка загрузки деталей NPC:', err);
        setError('Не удалось загрузить данные NPC');
      } finally {
        setLoadingDetails(false);
      }
    };
    loadFullNpc();
  }, [npc.id]);

  const loadAllItems = useCallback(async () => {
    setItemsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/items');
      if (!response.ok) throw new Error('Ошибка загрузки предметов');
      const data = await response.json();
      const itemsWithStatus = data.map((item: ItemType) => ({
        ...item,
        inInventory: (formData.items || []).some(npcItem => npcItem.id === item.id)
      }));
      setAllItems(itemsWithStatus);
    } catch (err) {
      console.error('Ошибка загрузки предметов:', err);
      setError('Не удалось загрузить список предметов');
    } finally {
      setItemsLoading(false);
    }
  }, [formData.items]);

  const loadAllAbilities = useCallback(async () => {
    setAbilitiesLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/abilities');
      if (!response.ok) throw new Error('Ошибка загрузки способностей');
      const data = await response.json();
      const abilitiesWithStatus = data.map((ability: AbilityType) => ({
        ...ability,
        inAbilities: (formData.abilities || []).some(npcAbility => npcAbility.id === ability.id)
      }));
      setAllAbilities(abilitiesWithStatus);
    } catch (err) {
      console.error('Ошибка загрузки способностей:', err);
      setError('Не удалось загрузить список способностей');
    } finally {
      setAbilitiesLoading(false);
    }
  }, [formData.abilities]);

  const loadAllEffects = useCallback(async () => {
    setEffectsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/effects');
      if (!response.ok) throw new Error('Ошибка загрузки эффектов');
      const data = await response.json();
      const effectsWithStatus = data.map((effect: EffectType) => ({
        ...effect,
        inEffects: (formData.active_effects || []).some(npcEffect => npcEffect.id === effect.id)
      }));
      setAllEffects(effectsWithStatus);
    } catch (err) {
      console.error('Ошибка загрузки эффектов:', err);
      setError('Не удалось загрузить список эффектов');
    } finally {
      setEffectsLoading(false);
    }
  }, [formData.active_effects]);

  useEffect(() => {
    if (activeTab === 'addItems') {
      loadAllItems();
    } else if (activeTab === 'addAbilities') {
      loadAllAbilities();
    } else if (activeTab === 'addEffects') {
      loadAllEffects();
    }
  }, [activeTab, loadAllItems, loadAllAbilities, loadAllEffects]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const numericFields = ['health', 'max_health', 'armor', 'strength', 'agility', 'intelligence', 'physique', 'wisdom', 'charisma', 'aggression'];
    if (numericFields.includes(name)) {
      setFormData({
        ...formData,
        [name]: value === '' ? 0 : parseInt(value, 10) || 0
      });
    } else if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // === Обработчики для предметов ===
  const handleItemQuantityChange = (itemId: number, quantity: number) => {
    setSelectedItems(prev => ({ ...prev, [itemId]: Math.max(1, quantity) }));
  };

  const handleEquipToggle = async (itemId: number) => {
    const newEquipStatus = !equipStatus[itemId];
    try {
      const response = await fetch(`http://localhost:5000/api/npcs/${npc.id}/items/${itemId}/equip`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_equipped: newEquipStatus })
      });
      if (!response.ok) throw new Error('Ошибка изменения статуса экипировки');
      setEquipStatus(prev => ({ ...prev, [itemId]: newEquipStatus }));
      await updateNpcData();
    } catch (err) {
      console.error('Ошибка:', err);
      setError(err instanceof Error ? err.message : 'Не удалось изменить статус экипировки');
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот предмет?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/npcs/${npc.id}/items/${itemId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Ошибка удаления предмета');
      await updateNpcData();
    } catch (err) {
      console.error('Ошибка:', err);
      setError(err instanceof Error ? err.message : 'Не удалось удалить предмет');
    }
  };

  const handleAddItems = async () => {
    const itemsToAdd = Object.entries(selectedItems)
      .filter(([, quantity]) => quantity > 0)
      .map(([itemId, quantity]) => ({ item_id: parseInt(itemId), quantity }));
    if (itemsToAdd.length === 0) {
      setError('Выберите предметы для добавления');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/npcs/${npc.id}/items/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToAdd })
      });
      if (!response.ok) throw new Error('Ошибка добавления предметов');
      setSelectedItems({});
      await updateNpcData();
      setActiveTab('currentItems');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка добавления предметов');
    } finally {
      setLoading(false);
    }
  };

  // === Обработчики для способностей ===
  const handleToggleAbilitySelection = (abilityId: number) => {
    setSelectedAbilities(prev =>
      prev.includes(abilityId) ? prev.filter(id => id !== abilityId) : [...prev, abilityId]
    );
  };

  const handleToggleAbilityActive = async (abilityId: number) => {
    try {
      const ability = formData.abilities?.find(a => a.id === abilityId);
      if (!ability) return;
      const response = await fetch(`http://localhost:5000/api/npcs/${npc.id}/abilities/${abilityId}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: ability.is_active === 1 ? 0 : 1 })
      });
      if (!response.ok) throw new Error('Ошибка изменения статуса способности');
      await updateNpcData();
    } catch (err) {
      console.error('Ошибка:', err);
      setError(err instanceof Error ? err.message : 'Не удалось изменить статус способности');
    }
  };

  const handleRemoveAbility = async (abilityId: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту способность?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/npcs/${npc.id}/abilities/${abilityId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Ошибка удаления способности');
      await updateNpcData();
    } catch (err) {
      console.error('Ошибка:', err);
      setError(err instanceof Error ? err.message : 'Не удалось удалить способность');
    }
  };

  const handleAddAbilities = async () => {
    if (selectedAbilities.length === 0) {
      setError('Выберите способности для добавления');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/npcs/${npc.id}/abilities/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ability_ids: selectedAbilities })
      });
      if (!response.ok) throw new Error('Ошибка добавления способностей');
      setSelectedAbilities([]);
      await updateNpcData();
      setActiveTab('currentAbilities');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка добавления способностей');
    } finally {
      setLoading(false);
    }
  };

  // === Обработчики для эффектов ===
  const handleToggleEffectSelection = (effectId: number) => {
    setSelectedEffects(prev =>
      prev.includes(effectId) ? prev.filter(id => id !== effectId) : [...prev, effectId]
    );
  };

  const handleRemoveEffect = async (effectId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот эффект?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/npcs/${npc.id}/effects/${effectId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Ошибка удаления эффекта');
      await updateNpcData();
    } catch (err) {
      console.error('Ошибка:', err);
      setError(err instanceof Error ? err.message : 'Не удалось удалить эффект');
    }
  };

  const handleAddEffects = async () => {
    if (selectedEffects.length === 0) {
      setError('Выберите эффекты для добавления');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/npcs/${npc.id}/effects/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ effect_ids: selectedEffects })
      });
      if (!response.ok) throw new Error('Ошибка добавления эффектов');
      setSelectedEffects([]);
      await updateNpcData();
      setActiveTab('currentEffects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка добавления эффектов');
    } finally {
      setLoading(false);
    }
  };

  const updateNpcData = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/npcs/${npc.id}/details`);
      if (!response.ok) throw new Error('Ошибка обновления данных');
      const data = await response.json();
      const updatedNpc = data.npc;
      setFormData({
        ...updatedNpc,
        items: updatedNpc.items || [],
        abilities: updatedNpc.abilities || [],
        active_effects: updatedNpc.active_effects || []
      });
      await fetchNpcs();
    } catch (err) {
      console.error('Ошибка обновления данных NPC:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!formData.name.trim()) {
      setError('Имя NPC обязательно');
      setLoading(false);
      return;
    }
    if (formData.health > formData.max_health) {
      setError('Текущее здоровье не может превышать максимальное');
      setLoading(false);
      return;
    }
    try {
      // Отправляем только поля, которые есть в таблице npcs
      const updateData = {
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
        in_battle: formData.in_battle ? 1 : 0,
        is_online: formData.is_online ? 1 : 0,
        is_card_shown: formData.is_card_shown ? 1 : 0,
        aggression: Number(formData.aggression),
      };
      const response = await fetch(`http://localhost:5000/api/npcs/${npc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка обновления NPC');
      }
      const result = await response.json();
      await fetchNpcs();
      if (result.success) {
        onNpcUpdated(result.npc);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка при обновлении NPC');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNpc = async () => {
    if (!confirm('Вы уверены, что хотите удалить этого NPC? Это действие необратимо.')) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:5000/api/npcs/${npc.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка удаления NPC');
      }
      await fetchNpcs();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка при удалении NPC');
    } finally {
      setDeleting(false);
    }
  };

  // ========== Рендеры вкладок ==========
  const renderStatsForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Имя NPC *</label>
          <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-3 py-2 border rounded" required maxLength={50} disabled={loading} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Пол</label>
          <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full px-3 py-2 border rounded" disabled={loading}>
            <option value="male">Мужской</option>
            <option value="female">Женский</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Текущее здоровье</label>
          <input type="number" name="health" value={formData.health} onChange={handleInputChange} min="0" max={formData.max_health} className="w-full px-3 py-2 border rounded" disabled={loading} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Максимальное здоровье</label>
          <input type="number" name="max_health" value={formData.max_health} onChange={handleInputChange} min="1" className="w-full px-3 py-2 border rounded" disabled={loading} />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Броня</label>
          <input type="number" name="armor" value={formData.armor} onChange={handleInputChange} className="w-full px-3 py-2 border rounded" disabled={loading} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Сила</label>
          <input type="number" name="strength" value={formData.strength} onChange={handleInputChange} className="w-full px-3 py-2 border rounded" disabled={loading} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ловкость</label>
          <input type="number" name="agility" value={formData.agility} onChange={handleInputChange} className="w-full px-3 py-2 border rounded" disabled={loading} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Интеллект</label>
          <input type="number" name="intelligence" value={formData.intelligence} onChange={handleInputChange} className="w-full px-3 py-2 border rounded" disabled={loading} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Телосложение</label>
          <input type="number" name="physique" value={formData.physique} onChange={handleInputChange} className="w-full px-3 py-2 border rounded" disabled={loading} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Мудрость</label>
          <input type="number" name="wisdom" value={formData.wisdom} onChange={handleInputChange} className="w-full px-3 py-2 border rounded" disabled={loading} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Харизма</label>
          <input type="number" name="charisma" value={formData.charisma} onChange={handleInputChange} className="w-full px-3 py-2 border rounded" disabled={loading} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Агрессия</label>
          <select name="aggression" value={formData.aggression} onChange={handleInputChange} className="w-full px-3 py-2 border rounded" disabled={loading}>
            <option value={0}>Мирный</option>
            <option value={1}>Нейтральный</option>
            <option value={2}>Агрессивный</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">История</label>
        <textarea name="history" value={formData.history || ''} onChange={handleInputChange} rows={3} className="w-full px-3 py-2 border rounded" disabled={loading} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center">
          <input type="checkbox" id="in_battle" name="in_battle" checked={formData.in_battle} onChange={handleInputChange} className="h-4 w-4 rounded" disabled={loading} />
          <label htmlFor="in_battle" className="ml-2 text-sm">В бою</label>
        </div>
        <div className="flex items-center">
          <input type="checkbox" id="is_online" name="is_online" checked={formData.is_online} onChange={handleInputChange} className="h-4 w-4 rounded" disabled={loading} />
          <label htmlFor="is_online" className="ml-2 text-sm">В сети</label>
        </div>
        <div className="flex items-center">
          <input type="checkbox" id="is_card_shown" name="is_card_shown" checked={formData.is_card_shown} onChange={handleInputChange} className="h-4 w-4 rounded" disabled={loading} />
          <label htmlFor="is_card_shown" className="ml-2 text-sm">Показывать карточку</label>
        </div>
      </div>
      <div className="flex justify-between items-center pt-6 border-t">
        <button type="button" onClick={handleDeleteNpc} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50" disabled={loading || deleting}>
          {deleting ? 'Удаление...' : 'Удалить NPC'}
        </button>
        <div className="flex space-x-3">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50" disabled={loading || deleting}>Отмена</button>
          <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50" disabled={loading || deleting}>
            {loading ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </div>
    </form>
  );

  const renderCurrentItems = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Текущие предметы NPC</h3>
      {(formData.items || []).length === 0 ? (
        <p className="text-gray-500">У NPC нет предметов</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {(formData.items || []).map(item => (
            <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{item.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-sm">
                      <span className="font-medium">Редкость:</span>{' '}
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.rarity === 'common' ? 'bg-gray-100 text-gray-800' :
                        item.rarity === 'uncommon' ? 'bg-green-100 text-green-800' :
                        item.rarity === 'rare' ? 'bg-blue-100 text-blue-800' :
                        item.rarity === 'epic' ? 'bg-purple-100 text-purple-800' :
                        item.rarity === 'legendary' ? 'bg-yellow-100 text-yellow-800' :
                        item.rarity === 'mythical' ? 'bg-red-100 text-red-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {item.rarity === 'common' ? 'Обычный' :
                        item.rarity === 'uncommon' ? 'Необычный' :
                        item.rarity === 'rare' ? 'Редкий' :
                        item.rarity === 'epic' ? 'Эпический' :
                        item.rarity === 'legendary' ? 'Легендарный' :
                        item.rarity === 'mythical' ? 'Мифический' :
                        'Сюжетный'}
                      </span>
                    </span>
                    <span className="text-sm">
                      <span className="font-medium">Количество:</span> {item.quantity}
                    </span>
                  </div>
                  {item.active_effect_name && (
                    <p className="text-sm mt-2"><span className="font-medium">Активный эффект:</span> {item.active_effect_name}</p>
                  )}
                  {item.passive_effect_name && (
                    <p className="text-sm mt-1"><span className="font-medium">Пассивный эффект:</span> {item.passive_effect_name}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleEquipToggle(item.id)}
                    className={`px-3 py-1 text-sm rounded ${
                      equipStatus[item.id]
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {equipStatus[item.id] ? 'Экипирован' : 'Не экипирован'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAddItems = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Добавить предметы</h3>
      {itemsLoading ? (
        <p className="text-gray-500">Загрузка предметов...</p>
      ) : allItems.length === 0 ? (
        <p className="text-gray-500">Нет доступных предметов</p>
      ) : (
        <>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {allItems.map(item => (
              <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{item.name}</h4>
                      {item.inInventory && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Уже есть</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm"><span className="font-medium">Редкость:</span> {item.rarity}</span>
                      <span className="text-sm"><span className="font-medium">Базовое количество:</span> {item.base_quantity}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={selectedItems[item.id] || 1}
                      onChange={(e) => handleItemQuantityChange(item.id, parseInt(e.target.value) || 1)}
                      className="w-20 px-2 py-1 border rounded"
                      disabled={item.inInventory}
                    />
                    <button
                      type="button"
                      onClick={() => handleItemQuantityChange(item.id, (selectedItems[item.id] || 1) + 1)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 disabled:opacity-50"
                      disabled={item.inInventory}
                    >
                      Добавить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium">Выбранные предметы:</h4>
                {Object.keys(selectedItems).length === 0 ? (
                  <p className="text-sm text-gray-500">Нет выбранных предметов</p>
                ) : (
                  <ul className="text-sm">
                    {Object.entries(selectedItems).map(([itemId, quantity]) => {
                      const item = allItems.find(i => i.id === parseInt(itemId));
                      return item ? <li key={itemId}>{item.name} × {quantity}</li> : null;
                    })}
                  </ul>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddItems}
                disabled={Object.keys(selectedItems).length === 0 || loading}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? 'Добавление...' : 'Добавить выбранные'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderCurrentAbilities = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Текущие способности NPC</h3>
      {(formData.abilities || []).length === 0 ? (
        <p className="text-gray-500">У NPC нет способностей</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {(formData.abilities || []).map(ability => (
            <div key={ability.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{ability.name}</h4>
                    <span className={`text-xs px-2 py-1 rounded ${
                      ability.ability_type === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {ability.ability_type === 'active' ? 'Активная' : 'Пассивная'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      ability.is_active === 1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {ability.is_active === 1 ? 'Активна' : 'Неактивна'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{ability.description}</p>
                  <div className="flex items-center gap-4 mt-2">
                    {ability.cooldown_turns > 0 && (
                      <span className="text-sm"><span className="font-medium">Перезарядка:</span> {ability.cooldown_turns} ход(ов)</span>
                    )}
                    {ability.effect_id && (
                      <span className="text-sm"><span className="font-medium">Эффект:</span> ID {ability.effect_id}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleAbilityActive(ability.id)}
                    className={`px-3 py-1 text-sm rounded ${
                      ability.is_active === 1
                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    {ability.is_active === 1 ? 'Деактивировать' : 'Активировать'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveAbility(ability.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAddAbilities = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Добавить способности</h3>
      {abilitiesLoading ? (
        <p className="text-gray-500">Загрузка способностей...</p>
      ) : allAbilities.length === 0 ? (
        <p className="text-gray-500">Нет доступных способностей</p>
      ) : (
        <>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {allAbilities.map(ability => (
              <div key={ability.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{ability.name}</h4>
                      {ability.inAbilities && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Уже есть</span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded ${
                        ability.ability_type === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {ability.ability_type === 'active' ? 'Активная' : 'Пассивная'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{ability.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      {ability.cooldown_turns > 0 && (
                        <span className="text-sm"><span className="font-medium">Перезарядка:</span> {ability.cooldown_turns} ход(ов)</span>
                      )}
                      {ability.cooldown_days > 0 && (
                        <span className="text-sm"><span className="font-medium">Дни перезарядки:</span> {ability.cooldown_days}</span>
                      )}
                      {ability.effect_id && (
                        <span className="text-sm"><span className="font-medium">Эффект:</span> ID {ability.effect_id}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <input
                      type="checkbox"
                      checked={selectedAbilities.includes(ability.id)}
                      onChange={() => handleToggleAbilitySelection(ability.id)}
                      className="h-5 w-5"
                      disabled={ability.inAbilities}
                    />
                    <button
                      type="button"
                      onClick={() => handleToggleAbilitySelection(ability.id)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 disabled:opacity-50"
                      disabled={ability.inAbilities}
                    >
                      {selectedAbilities.includes(ability.id) ? 'Отменить' : 'Выбрать'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium">Выбранные способности:</h4>
                {selectedAbilities.length === 0 ? (
                  <p className="text-sm text-gray-500">Нет выбранных способностей</p>
                ) : (
                  <ul className="text-sm">
                    {selectedAbilities.map(abilityId => {
                      const ability = allAbilities.find(a => a.id === abilityId);
                      return ability ? <li key={abilityId}>{ability.name}</li> : null;
                    })}
                  </ul>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddAbilities}
                disabled={selectedAbilities.length === 0 || loading}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? 'Добавление...' : 'Добавить выбранные'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderCurrentEffects = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Текущие эффекты NPC</h3>
      {(formData.active_effects || []).length === 0 ? (
        <p className="text-gray-500">У NPC нет активных эффектов</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {(formData.active_effects || []).map(effect => (
            <div key={effect.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{effect.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{effect.description}</p>
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <span className="text-sm"><span className="font-medium">Атрибут:</span> {effect.attribute}</span>
                    <span className="text-sm"><span className="font-medium">Модификатор:</span> {effect.modifier > 0 ? '+' : ''}{effect.modifier}</span>
                    {effect.duration_turns !== null && (
                      <span className="text-sm"><span className="font-medium">Длительность:</span> {effect.duration_turns} ход(ов)</span>
                    )}
                    {effect.duration_days !== null && (
                      <span className="text-sm"><span className="font-medium">Дни:</span> {effect.duration_days}</span>
                    )}
                    {effect.is_permanent && (
                      <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">Постоянный</span>
                    )}
                    {effect.remaining_turns !== null && (
                      <span className="text-sm"><span className="font-medium">Осталось ходов:</span> {effect.remaining_turns}</span>
                    )}
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => handleRemoveEffect(effect.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAddEffects = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Добавить эффекты</h3>
      {effectsLoading ? (
        <p className="text-gray-500">Загрузка эффектов...</p>
      ) : allEffects.length === 0 ? (
        <p className="text-gray-500">Нет доступных эффектов</p>
      ) : (
        <>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {allEffects.map(effect => (
              <div key={effect.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{effect.name}</h4>
                      {effect.inEffects && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Уже есть</span>
                      )}
                      {effect.is_permanent && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Постоянный</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{effect.description}</p>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <span className="text-sm"><span className="font-medium">Атрибут:</span> {effect.attribute}</span>
                      <span className="text-sm"><span className="font-medium">Модификатор:</span> {effect.modifier > 0 ? '+' : ''}{effect.modifier}</span>
                      {effect.duration_turns !== null && (
                        <span className="text-sm"><span className="font-medium">Длительность:</span> {effect.duration_turns} ход(ов)</span>
                      )}
                      {effect.duration_days !== null && (
                        <span className="text-sm"><span className="font-medium">Дни:</span> {effect.duration_days}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <input
                      type="checkbox"
                      checked={selectedEffects.includes(effect.id)}
                      onChange={() => handleToggleEffectSelection(effect.id)}
                      className="h-5 w-5"
                      disabled={effect.inEffects}
                    />
                    <button
                      type="button"
                      onClick={() => handleToggleEffectSelection(effect.id)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 disabled:opacity-50"
                      disabled={effect.inEffects}
                    >
                      {selectedEffects.includes(effect.id) ? 'Отменить' : 'Выбрать'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium">Выбранные эффекты:</h4>
                {selectedEffects.length === 0 ? (
                  <p className="text-sm text-gray-500">Нет выбранных эффектов</p>
                ) : (
                  <ul className="text-sm">
                    {selectedEffects.map(effectId => {
                      const effect = allEffects.find(e => e.id === effectId);
                      return effect ? <li key={effectId}>{effect.name}</li> : null;
                    })}
                  </ul>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddEffects}
                disabled={selectedEffects.length === 0 || loading}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? 'Добавление...' : 'Добавить выбранные'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  if (loadingDetails) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">Загрузка данных NPC...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Редактирование NPC</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl" disabled={loading}>&times;</button>
          </div>
          {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}
          
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-4 overflow-x-auto">
              <button onClick={() => setActiveTab('stats')} className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'stats' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>Основное</button>
              <button onClick={() => setActiveTab('currentItems')} className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'currentItems' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>Предметы ({(formData.items || []).length})</button>
              <button onClick={() => setActiveTab('currentAbilities')} className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'currentAbilities' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>Способности ({(formData.abilities || []).length})</button>
              <button onClick={() => setActiveTab('currentEffects')} className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'currentEffects' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>Эффекты ({(formData.active_effects || []).length})</button>
            </nav>
            <nav className="-mb-px flex space-x-4 overflow-x-auto mt-2">
              <button onClick={() => setActiveTab('addItems')} className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'addItems' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>+ Добавить предметы</button>
              <button onClick={() => setActiveTab('addAbilities')} className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'addAbilities' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>+ Добавить способности</button>
              <button onClick={() => setActiveTab('addEffects')} className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'addEffects' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>+ Добавить эффекты</button>
            </nav>
          </div>

          {activeTab === 'stats' && renderStatsForm()}
          {activeTab === 'currentItems' && renderCurrentItems()}
          {activeTab === 'addItems' && renderAddItems()}
          {activeTab === 'currentAbilities' && renderCurrentAbilities()}
          {activeTab === 'addAbilities' && renderAddAbilities()}
          {activeTab === 'currentEffects' && renderCurrentEffects()}
          {activeTab === 'addEffects' && renderAddEffects()}
        </div>
      </div>
    </div>
  );
};
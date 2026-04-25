// client/src/components/ui/NpcAbilitiesManager.tsx
import { useState, useEffect, useCallback } from 'react';
import type { AbilityType, FullNPCData } from '../../types';

type NpcAbility = FullNPCData['abilities'][0];

interface NpcAbilitiesManagerProps {
  npcId: number;
  abilities: NpcAbility[];
  onDataChanged: () => Promise<void>;
  showError: (msg: string) => void;
}

type AbilitiesSubTab = 'list' | 'add';

export const NpcAbilitiesManager = ({ npcId, abilities, onDataChanged, showError }: NpcAbilitiesManagerProps) => {
  const [abilitiesSubTab, setAbilitiesSubTab] = useState<AbilitiesSubTab>('list');
  const [allAbilities, setAllAbilities] = useState<AbilityType[]>([]);
  const [abilitiesLoading, setAbilitiesLoading] = useState(false);
  const [selectedAbilities, setSelectedAbilities] = useState<number[]>([]);
  const [abilitySearch, setAbilitySearch] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUseAbility = async (abilityId: number, abilityName: string) => {
    if (!confirm(`Использовать способность "${abilityName}"?`)) return;
    try {
      const response = await fetch(`/api/npc-abilities/${npcId}/abilities/${abilityId}/use`, { method: 'POST' });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text);
      }
      await onDataChanged();
      showError(`✅ ${abilityName} использована!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка использования способности';
      showError(message);
    }
  };

  const loadAllAbilities = useCallback(async () => {
    setAbilitiesLoading(true);
    try {
      const response = await fetch('/api/abilities');
      if (!response.ok) throw new Error();
      setAllAbilities(await response.json());
    } catch {
      showError('Не удалось загрузить способности');
    } finally {
      setAbilitiesLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (abilitiesSubTab === 'add') loadAllAbilities();
  }, [abilitiesSubTab, loadAllAbilities]);

  const handleToggleAbilityActive = async (abilityId: number) => {
    const ability = abilities.find(a => a.id === abilityId);
    if (!ability) return;
    try {
      await fetch(`/api/npcs/${npcId}/abilities/${abilityId}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !ability.is_active })
      });
      await onDataChanged();
    } catch {
      showError('Ошибка изменения активности');
    }
  };

  const handleRemoveAbility = async (abilityId: number) => {
    if (!confirm('Удалить способность?')) return;
    try {
      await fetch(`/api/npcs/${npcId}/abilities/${abilityId}`, { method: 'DELETE' });
      await onDataChanged();
    } catch {
      showError('Ошибка удаления');
    }
  };

  const handleAddAbilities = async () => {
    if (selectedAbilities.length === 0) { showError('Выберите способности'); return; }
    setLoading(true);
    try {
      const response = await fetch(`/api/npcs/${npcId}/abilities/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ability_ids: selectedAbilities })
      });
      if (!response.ok) throw new Error();
      setSelectedAbilities([]);
      await onDataChanged();
      setAbilitiesSubTab('list');
    } catch {
      showError('Ошибка добавления');
    } finally {
      setLoading(false);
    }
  };

  const renderCurrentAbilities = () => {
    if (!abilities.length) return <p className="text-center text-gray-500 py-8">✨ Нет способностей</p>;
    return (
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {abilities.map(ability => {
          const isActiveAbility = ability.ability_type === 'active';
          const remainingCooldown = ability.remaining_cooldown_turns || 0;
          const canUse = isActiveAbility && ability.is_active && remainingCooldown === 0;

          return (
            <div key={ability.id} className="bg-gray-50 rounded-xl p-3 md:p-4 border">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                <div>
                  <h4 className="font-semibold">{ability.name}</h4>
                  <p className="text-sm text-gray-500">{ability.description}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-xs bg-white px-2 py-0.5 rounded-full">{ability.ability_type}</span>
                    {ability.cooldown_turns > 0 && (
                      <span className="text-xs bg-white px-2 py-0.5 rounded-full">
                        Перезарядка: {ability.cooldown_turns}{' '}
                        {remainingCooldown > 0 && `(осталось ${remainingCooldown})`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-row sm:flex-col items-center gap-2">
                  {isActiveAbility && (
                    <button
                      onClick={() => handleUseAbility(ability.id, ability.name)}
                      disabled={!canUse}
                      className={`text-sm px-3 py-1 rounded-full ${
                        canUse ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {remainingCooldown > 0 ? `⏳ ${remainingCooldown}` : 'Использовать'}
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleAbilityActive(ability.id)}
                    className={`text-sm px-3 py-1 rounded-full ${ability.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}
                  >
                    {ability.is_active ? 'Активна' : 'Неактивна'}
                  </button>
                  <button onClick={() => handleRemoveAbility(ability.id)} className="text-red-500 text-sm">
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAddAbilities = () => {
    const filtered = allAbilities.filter(a => a.name.toLowerCase().includes(abilitySearch.toLowerCase()));
    const ownedIds = new Set(abilities.map(a => a.id));
    return (
      <div className="space-y-4">
        <input
          type="text"
          placeholder="🔍 Поиск способностей..."
          value={abilitySearch}
          onChange={e => setAbilitySearch(e.target.value)}
          className="w-full px-3 py-2 border rounded-xl"
        />
        {abilitiesLoading ? (
          <p>Загрузка...</p>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {filtered.map(ability => {
              const owned = ownedIds.has(ability.id);
              return (
                <div key={ability.id} className="bg-gray-50 p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <p className="font-medium">{ability.name}</p>
                    <p className="text-xs text-gray-500">{ability.ability_type}</p>
                  </div>
                  {!owned ? (
                    <button
                      onClick={() =>
                        setSelectedAbilities(prev =>
                          prev.includes(ability.id) ? prev.filter(id => id !== ability.id) : [...prev, ability.id]
                        )
                      }
                      className={`px-3 py-1 rounded-xl ${selectedAbilities.includes(ability.id) ? 'bg-green-500 text-white' : 'bg-blue-100'}`}
                    >
                      {selectedAbilities.includes(ability.id) ? '✓ Выбрана' : 'Выбрать'}
                    </button>
                  ) : (
                    <span className="text-green-600 text-sm">✓ Уже есть</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="pt-2 flex flex-col sm:flex-row justify-between items-center gap-2 border-t">
          <span>Выбрано: {selectedAbilities.length}</span>
          <button
            onClick={handleAddAbilities}
            disabled={selectedAbilities.length === 0 || loading}
            className="w-full sm:w-auto px-4 py-2 bg-green-500 text-white rounded-xl"
          >
            Добавить выбранные
          </button>
        </div>
        <button onClick={() => setAbilitiesSubTab('list')} className="mt-2 text-sm text-gray-500 hover:text-gray-700">
          ← Назад к списку
        </button>
      </div>
    );
  };

  return (
    <div>
      {abilitiesSubTab === 'list' ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">✨ Способности NPC</h3>
            <button
              onClick={() => {
                setAbilitiesSubTab('add');
                setSelectedAbilities([]);
              }}
              className="px-3 py-1 bg-green-100 text-green-700 rounded-xl text-sm"
            >
              ➕ Добавить способность
            </button>
          </div>
          {renderCurrentAbilities()}
        </div>
      ) : (
        renderAddAbilities()
      )}
    </div>
  );
};
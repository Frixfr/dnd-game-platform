// client/src/components/ui/NpcAbilitiesManager.tsx
import { useState, useEffect, useCallback } from 'react';
import type { AbilityType, FullNPCData } from '../../types';
import { useConfirm } from '../../hooks/useConfirm';

type NpcAbility = FullNPCData['abilities'][0];

interface NpcAbilitiesManagerProps {
  npcId: number;
  abilities: NpcAbility[];
  onDataChanged: () => Promise<void>;
  showError: (msg: string) => void;
}

type AbilitiesSubTab = 'list' | 'add';

export const NpcAbilitiesManager = ({ npcId, abilities, onDataChanged, showError }: NpcAbilitiesManagerProps) => {
  const { confirm, ConfirmModalComponent } = useConfirm();
  const [abilitiesSubTab, setAbilitiesSubTab] = useState<AbilitiesSubTab>('list');
  const [allAbilities, setAllAbilities] = useState<AbilityType[]>([]);
  const [abilitiesLoading, setAbilitiesLoading] = useState(false);
  const [selectedAbilities, setSelectedAbilities] = useState<number[]>([]);
  const [abilitySearch, setAbilitySearch] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUseAbility = (abilityId: number, abilityName: string) => {
    confirm({
      message: `Использовать способность "${abilityName}"?`,
      onConfirm: async () => {
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
      }
    });
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

  const handleRemoveAbility = (abilityId: number) => {
    confirm({
      message: 'Удалить способность?',
      onConfirm: async () => {
        try {
          await fetch(`/api/npcs/${npcId}/abilities/${abilityId}`, { method: 'DELETE' });
          await onDataChanged();
        } catch {
          showError('Ошибка удаления');
        }
      }
    });
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
    if (!abilities.length) return <p className="text-center text-text-secondary py-8">✨ Нет способностей</p>;
    return (
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {abilities.map(ability => {
          const isActiveAbility = ability.ability_type === 'active';
          const remainingCooldown = ability.remaining_cooldown_turns || 0;
          const canUse = isActiveAbility && ability.is_active && remainingCooldown === 0;

          return (
            <div key={ability.id} className="card p-3 md:p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                <div>
                  <h4 className="font-semibold text-text-primary">{ability.name}</h4>
                  <p className="text-sm text-text-secondary">{ability.description}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-xs bg-bg-secondary px-2 py-0.5 rounded-full text-text-primary">{ability.ability_type}</span>
                    {ability.cooldown_turns > 0 && (
                      <span className="text-xs bg-bg-secondary px-2 py-0.5 rounded-full text-text-primary">
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
                        canUse ? 'btn-primary' : 'bg-bg-tertiary text-text-secondary cursor-not-allowed'
                      }`}
                    >
                      {remainingCooldown > 0 ? `⏳ ${remainingCooldown}` : 'Использовать'}
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleAbilityActive(ability.id)}
                    className={`text-sm px-3 py-1 rounded-full ${ability.is_active ? 'bg-green-500/20 text-green-400' : 'bg-bg-tertiary text-text-secondary'}`}
                  >
                    {ability.is_active ? 'Активна' : 'Неактивна'}
                  </button>
                  <button onClick={() => handleRemoveAbility(ability.id)} className="text-accent-red text-sm hover:underline">
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
          className="form-input"
        />
        {abilitiesLoading ? (
          <p className="text-text-secondary">Загрузка...</p>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {filtered.map(ability => {
              const owned = ownedIds.has(ability.id);
              return (
                <div key={ability.id} className="card p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <p className="font-medium text-text-primary">{ability.name}</p>
                    <p className="text-xs text-text-secondary">{ability.ability_type}</p>
                  </div>
                  {!owned ? (
                    <button
                      onClick={() =>
                        setSelectedAbilities(prev =>
                          prev.includes(ability.id) ? prev.filter(id => id !== ability.id) : [...prev, ability.id]
                        )
                      }
                      className={`px-3 py-1 rounded-xl ${selectedAbilities.includes(ability.id) ? 'btn-primary' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'}`}
                    >
                      {selectedAbilities.includes(ability.id) ? '✓ Выбрана' : 'Выбрать'}
                    </button>
                  ) : (
                    <span className="text-green-400 text-sm">✓ Уже есть</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="pt-2 flex flex-col sm:flex-row justify-between items-center gap-2 border-t border-border-color">
          <span className="text-text-primary">Выбрано: {selectedAbilities.length}</span>
          <button
            onClick={handleAddAbilities}
            disabled={selectedAbilities.length === 0 || loading}
            className="w-full sm:w-auto px-4 py-2 btn-primary"
          >
            Добавить выбранные
          </button>
        </div>
        <button onClick={() => setAbilitiesSubTab('list')} className="mt-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
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
            <h3 className="text-lg font-semibold text-text-primary">✨ Способности NPC</h3>
            <button
              onClick={() => {
                setAbilitiesSubTab('add');
                setSelectedAbilities([]);
              }}
              className="px-3 py-1 btn-secondary text-sm"
            >
              ➕ Добавить способность
            </button>
          </div>
          {renderCurrentAbilities()}
        </div>
      ) : (
        renderAddAbilities()
      )}
      {ConfirmModalComponent}
    </div>
  );
};
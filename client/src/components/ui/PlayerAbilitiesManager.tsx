// client/src/components/ui/PlayerAbilitiesManager.tsx
import { useState, useEffect, useCallback } from 'react';
import type { PlayerAbilityExtended, AbilityType } from '../../types';
import { usePlayerStore } from '../../stores/playerStore';
import { useConfirm } from '../../hooks/useConfirm';

interface PlayerAbilitiesManagerProps {
  playerId: number;
  abilities: PlayerAbilityExtended[];
  onDataChanged: () => Promise<void>;
  showError: (msg: string) => void;
}

type AbilitiesSubTab = 'list' | 'add';

export const PlayerAbilitiesManager = ({ playerId, abilities, onDataChanged, showError }: PlayerAbilitiesManagerProps) => {
  const { confirm, ConfirmModalComponent } = useConfirm();
  const [abilitiesSubTab, setAbilitiesSubTab] = useState<AbilitiesSubTab>('list');
  const [allAbilities, setAllAbilities] = useState<AbilityType[]>([]);
  const [abilitiesLoading, setAbilitiesLoading] = useState(false);
  const [selectedAbilities, setSelectedAbilities] = useState<number[]>([]);
  const [abilitySearch, setAbilitySearch] = useState('');
  const [loading, setLoading] = useState(false);
  const { executeUseAbility } = usePlayerStore();

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
      await fetch(`/api/players/${playerId}/abilities/${abilityId}/toggle`, {
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
          await fetch(`/api/players/${playerId}/abilities/${abilityId}`, { method: 'DELETE' });
          await onDataChanged();
        } catch {
          showError('Ошибка удаления');
        }
      }
    });
  };

  const handleUseAbility = (abilityId: number, abilityName: string) => {
    confirm({
      message: `Использовать способность "${abilityName}"?`,
      onConfirm: async () => {
        try {
          await executeUseAbility(playerId, abilityId);
          await onDataChanged();
          showError(`✅ ${abilityName} использована!`);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Ошибка использования способности';
          showError(message);
        }
      }
    });
  };

  const handleAddAbilities = async () => {
    if (selectedAbilities.length === 0) { showError('Выберите способности'); return; }
    setLoading(true);
    try {
      const response = await fetch(`/api/players/${playerId}/abilities/batch`, {
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
    if (!abilities.length) return <p className="text-center text-[#F2E9E4]/60 py-8">✨ Нет способностей</p>;
    return (
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {abilities.map(ability => {
          const isActiveAbility = ability.ability_type === 'active';
          const remainingCooldown = ability.remaining_cooldown_turns || 0;
          const canUse = isActiveAbility && ability.is_active && remainingCooldown === 0;

          return (
            <div key={ability.id} className="bg-[#0A1F44]/50 rounded-xl p-3 md:p-4 border">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                <div>
                  <h4 className="font-semibold">{ability.name}</h4>
                  <p className="text-sm text-[#F2E9E4]/60">{ability.description}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-xs bg-[#0A1F44] px-2 py-0.5 rounded-full border border-[#F2E9E4]/30 text-[#F2E9E4]">{ability.ability_type}</span>
                    {ability.cooldown_turns > 0 && (
                      <span className="text-xs bg-[#0A1F44] px-2 py-0.5 rounded-full border border-[#F2E9E4]/30 text-[#F2E9E4]">
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
                      className={`text-sm px-3 py-1 btn-secondary ${!canUse ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {remainingCooldown > 0 ? `⏳ ${remainingCooldown}` : 'Использовать'}
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleAbilityActive(ability.id)}
                    className={`text-sm px-3 py-1 rounded-full ${ability.is_active ? 'bg-green-100 text-green-700' : 'bg-[#0A1F44]/80 text-[#F2E9E4] border border-[#F2E9E4]/20'}`}
                  >
                    {ability.is_active ? 'Активна' : 'Неактивна'}
                  </button>
                  <button onClick={() => handleRemoveAbility(ability.id)} className="text-red-500 text-sm">Удалить</button>
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
        <input type="text" placeholder="🔍 Поиск способностей..." value={abilitySearch} onChange={e => setAbilitySearch(e.target.value)} className="form-input w-full" />
        {abilitiesLoading ? <p>Загрузка...</p> : (
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
                      className={`px-3 py-1 rounded-xl ${selectedAbilities.includes(ability.id) ? 'btn-primary' : 'btn-secondary'}`}
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
          <button onClick={handleAddAbilities} disabled={selectedAbilities.length === 0 || loading} className="w-full sm:w-auto px-4 py-2 btn-primary">Добавить выбранные</button>
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
            <h3 className="text-lg font-semibold">✨ Способности игрока</h3>
            <button onClick={() => { setAbilitiesSubTab('add'); setSelectedAbilities([]); }} className="px-3 py-1 btn-secondary text-sm">➕ Добавить способность</button>
          </div>
          {renderCurrentAbilities()}
        </div>
      ) : renderAddAbilities()}
      {ConfirmModalComponent}
    </div>
  );
};
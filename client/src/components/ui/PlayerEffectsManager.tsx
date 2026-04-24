// client/src/components/ui/PlayerEffectsManager.tsx
import { useState, useEffect, useCallback } from 'react';
import type { PlayerEffectExtended, EffectType } from '../../types';
import { EffectCard } from './EffectCard';

interface PlayerEffectsManagerProps {
  playerId: number;
  activeEffects: PlayerEffectExtended[];
  raceEffects: EffectType[];
  raceName?: string | null;
  itemPassiveEffects: (EffectType & { source_item_name: string })[];
  onDataChanged: () => Promise<void>;
  showError: (msg: string) => void;
}

type EffectsSubTab = 'list' | 'add';

export const PlayerEffectsManager = ({ 
  playerId, 
  activeEffects, 
  raceEffects, 
  raceName,
  itemPassiveEffects, 
  onDataChanged, 
  showError 
}: PlayerEffectsManagerProps) => {
  const [effectsSubTab, setEffectsSubTab] = useState<EffectsSubTab>('list');
  const [allEffects, setAllEffects] = useState<EffectType[]>([]);
  const [effectsLoading, setEffectsLoading] = useState(false);
  const [selectedEffects, setSelectedEffects] = useState<number[]>([]);
  const [effectSearch, setEffectSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadAllEffects = useCallback(async () => {
    setEffectsLoading(true);
    try {
      const response = await fetch('/api/effects');
      if (!response.ok) throw new Error();
      setAllEffects(await response.json());
    } catch {
      showError('Не удалось загрузить эффекты');
    } finally {
      setEffectsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (effectsSubTab === 'add') loadAllEffects();
  }, [effectsSubTab, loadAllEffects]);

  const handleRemoveEffect = async (effectId: number) => {
    if (!confirm('Удалить эффект?')) return;
    try {
      await fetch(`/api/players/${playerId}/effects/${effectId}`, { method: 'DELETE' });
      await onDataChanged();
    } catch {
      showError('Ошибка удаления');
    }
  };

  const handleAddEffects = async () => {
    if (selectedEffects.length === 0) { showError('Выберите эффекты'); return; }
    setLoading(true);
    try {
      const response = await fetch(`/api/players/${playerId}/effects/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ effect_ids: selectedEffects })
      });
      if (!response.ok) throw new Error();
      setSelectedEffects([]);
      await onDataChanged();
      setEffectsSubTab('list');
    } catch {
      showError('Ошибка добавления');
    } finally {
      setLoading(false);
    }
  };

  const renderCurrentEffects = () => {
    // Разделяем активные эффекты на пассивные от способностей и остальные временные
    const passiveAbilityEffects = activeEffects.filter(
      (effect) => effect.source_type === 'ability' && effect.remaining_turns === null && effect.remaining_days === null
    );
    // Все остальные эффекты (временные, от активных способностей, предметов, админа)
    const temporaryEffects = activeEffects.filter(
      (effect) => !(effect.source_type === 'ability' && effect.remaining_turns === null && effect.remaining_days === null)
    );

    const hasEffects =
      passiveAbilityEffects.length > 0 ||
      temporaryEffects.length > 0 ||
      raceEffects.length > 0 ||
      itemPassiveEffects.length > 0;

    if (!hasEffects) {
      return <p className="text-center text-gray-500 py-8">🌀 Нет эффектов</p>;
    }

    return (
      <div className="space-y-6 max-h-[60vh] overflow-y-auto">
        {/* Расовые эффекты (без изменений) */}
        {raceEffects.length > 0 && (
          <div>
            <h3 className="text-md font-semibold text-purple-700 mb-2 flex items-center gap-2">
              <span className="text-xl">🌿</span> Эффекты расы
            </h3>
            <div className="space-y-3">
              {raceEffects.map((effect, idx) => (
                <EffectCard
                  key={`race-${effect.id}-${idx}`}
                  effect={effect}
                  sourceType="race"
                  sourceName={raceName || 'Раса'}
                  showDescription
                />
              ))}
            </div>
          </div>
        )}

        {/* Пассивные эффекты предметов (без изменений) */}
        {itemPassiveEffects.length > 0 && (
          <div>
            <h3 className="text-md font-semibold text-blue-700 mb-2 flex items-center gap-2">
              <span className="text-xl">📦</span> Пассивные эффекты предметов
            </h3>
            <div className="space-y-3">
              {itemPassiveEffects.map((effect, idx) => (
                <EffectCard
                  key={`item-passive-${effect.id}-${idx}`}
                  effect={effect}
                  sourceType="item"
                  sourceName={effect.source_item_name}
                  showDescription
                />
              ))}
            </div>
          </div>
        )}

        {/* Пассивные способности (новый блок) */}
        {passiveAbilityEffects.length > 0 && (
          <div>
            <h3 className="text-md font-semibold text-indigo-700 mb-2 flex items-center gap-2">
              <span className="text-xl">⚡</span> Пассивные способности
            </h3>
            <div className="space-y-3">
              {passiveAbilityEffects.map((effect, idx) => (
                <EffectCard
                  key={`passive-ability-${effect.id}-${idx}`}
                  effect={effect}
                  sourceType="ability"
                  sourceName={effect.source_name}
                  showDescription
                  // без onDelete — нельзя удалить
                />
              ))}
            </div>
          </div>
        )}

        {/* Временные эффекты (бывшие «Активные») */}
        {temporaryEffects.length > 0 && (
          <div>
            <h3 className="text-md font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span className="text-xl">🌀</span> Временные эффекты
            </h3>
            <div className="space-y-3">
              {temporaryEffects.map((effect, idx) => (
                <EffectCard
                  key={`temporary-${effect.id}-${idx}`}
                  effect={effect}
                  sourceType={effect.source_type}
                  sourceName={effect.source_name}
                  showDescription
                  onDelete={() => handleRemoveEffect(effect.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAddEffects = () => {
    const filtered = allEffects.filter(e => e.name.toLowerCase().includes(effectSearch.toLowerCase()));
    const ownedIds = new Set(activeEffects.map(e => e.id));
    return (
      <div className="space-y-4">
        <input type="text" placeholder="🔍 Поиск эффектов..." value={effectSearch} onChange={e => setEffectSearch(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
        {effectsLoading ? <p>Загрузка...</p> : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {filtered.map(effect => {
              const owned = ownedIds.has(effect.id);
              return (
                <div key={effect.id} className="bg-gray-50 p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div><p className="font-medium">{effect.name}</p><p className="text-xs text-gray-500">{effect.attribute} {effect.modifier > 0 ? `+${effect.modifier}` : effect.modifier}</p></div>
                  {!owned ? (
                    <button onClick={() => setSelectedEffects(prev => prev.includes(effect.id) ? prev.filter(id => id !== effect.id) : [...prev, effect.id])} className={`px-3 py-1 rounded-xl ${selectedEffects.includes(effect.id) ? 'bg-green-500 text-white' : 'bg-blue-100'}`}>{selectedEffects.includes(effect.id) ? '✓ Выбран' : 'Выбрать'}</button>
                  ) : <span className="text-green-600 text-sm">✓ Уже есть</span>}
                </div>
              );
            })}
          </div>
        )}
        <div className="pt-2 flex flex-col sm:flex-row justify-between items-center gap-2 border-t">
          <span>Выбрано: {selectedEffects.length}</span>
          <button onClick={handleAddEffects} disabled={selectedEffects.length === 0 || loading} className="w-full sm:w-auto px-4 py-2 bg-green-500 text-white rounded-xl">Добавить выбранные</button>
        </div>
        <button onClick={() => setEffectsSubTab('list')} className="mt-2 text-sm text-gray-500 hover:text-gray-700">← Назад к списку</button>
      </div>
    );
  };

  return (
    <div>
      {effectsSubTab === 'list' ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">🌀 Эффекты</h3>
            <button onClick={() => { setEffectsSubTab('add'); setSelectedEffects([]); }} className="px-3 py-1 bg-green-100 text-green-700 rounded-xl text-sm">➕ Добавить эффект</button>
          </div>
          {renderCurrentEffects()}
        </div>
      ) : renderAddEffects()}
    </div>
  );
};
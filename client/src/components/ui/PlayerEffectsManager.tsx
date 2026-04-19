// client/src/components/ui/PlayerEffectsManager.tsx
import { useState, useEffect, useCallback } from 'react';
import type { PlayerEffectExtended, EffectType } from '../../types';

interface PlayerEffectsManagerProps {
  playerId: number;
  activeEffects: PlayerEffectExtended[];
  raceEffects: EffectType[];
  itemPassiveEffects?: EffectType[]; // новый пропс
  onDataChanged: () => Promise<void>;
  showError: (msg: string) => void;
}

type EffectsSubTab = 'list' | 'add';

export const PlayerEffectsManager = ({ 
  playerId, 
  activeEffects, 
  raceEffects, 
  itemPassiveEffects = [], 
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
    const hasEffects = activeEffects.length > 0 || raceEffects.length > 0 || itemPassiveEffects.length > 0;
    if (!hasEffects) {
      return <p className="text-center text-gray-500 py-8">🌀 Нет эффектов</p>;
    }
    return (
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {/* Расовые эффекты */}
        {raceEffects.map((effect, idx) => (
          <div key={`race-${effect.id}-${idx}`} className="bg-purple-50 rounded-xl p-3 md:p-4 border border-purple-200">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-purple-800">{effect.name}</h4>
                  <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">Расовый эффект</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{effect.description || 'Нет описания'}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {effect.attribute && (
                    <span className="text-xs bg-white px-2 py-0.5 rounded-full">
                      {effect.attribute}: {effect.modifier > 0 ? `+${effect.modifier}` : effect.modifier}
                    </span>
                  )}
                  {effect.duration_turns && (
                    <span className="text-xs bg-white px-2 py-0.5 rounded-full">{effect.duration_turns} ходов</span>
                  )}
                  {effect.duration_days && (
                    <span className="text-xs bg-white px-2 py-0.5 rounded-full">{effect.duration_days} дней</span>
                  )}
                  {effect.is_permanent && (
                    <span className="text-xs bg-white px-2 py-0.5 rounded-full">Постоянный</span>
                  )}
                </div>
              </div>
              <div className="text-xs text-purple-500 italic">(меняется только сменой расы)</div>
            </div>
          </div>
        ))}

        {/* Пассивные эффекты от предметов (новый блок) */}
        {itemPassiveEffects.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
              <span className="text-lg">📦</span> Пассивные эффекты от предметов
            </h4>
            {itemPassiveEffects.map((effect, idx) => (
              <div key={`item-passive-${effect.id}-${idx}`} className="bg-blue-50 rounded-xl p-3 md:p-4 border border-blue-200">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-blue-800">{effect.name}</h4>
                    <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">Пассивный (от предмета)</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{effect.description || 'Нет описания'}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {effect.attribute && (
                      <span className="text-xs bg-white px-2 py-0.5 rounded-full">
                        {effect.attribute}: {effect.modifier > 0 ? `+${effect.modifier}` : effect.modifier}
                      </span>
                    )}
                    {effect.duration_turns && (
                      <span className="text-xs bg-white px-2 py-0.5 rounded-full">{effect.duration_turns} ходов</span>
                    )}
                    {effect.duration_days && (
                      <span className="text-xs bg-white px-2 py-0.5 rounded-full">{effect.duration_days} дней</span>
                    )}
                    {effect.is_permanent && (
                      <span className="text-xs bg-white px-2 py-0.5 rounded-full">Постоянный</span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-blue-500 italic mt-2">(действует, пока предмет в инвентаре)</div>
              </div>
            ))}
          </div>
        )}

        {/* Активные эффекты (временные) */}
        {activeEffects.map((effect, idx) => (
          <div key={`active-${effect.id}-${idx}`} className="bg-gray-50 rounded-xl p-3 md:p-4 border">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
              <div>
                <h4 className="font-semibold">{effect.name}</h4>
                <p className="text-sm text-gray-500">{effect.description}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {effect.attribute && (
                    <span className="text-xs bg-white px-2 py-0.5 rounded-full">
                      {effect.attribute}: {effect.modifier > 0 ? `+${effect.modifier}` : effect.modifier}
                    </span>
                  )}
                  {effect.duration_turns && (
                    <span className="text-xs bg-white px-2 py-0.5 rounded-full">{effect.duration_turns} ходов</span>
                  )}
                </div>
              </div>
              <button onClick={() => handleRemoveEffect(effect.id)} className="text-red-500 text-sm">Удалить</button>
            </div>
          </div>
        ))}
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
            <h3 className="text-lg font-semibold">🌀 Активные эффекты</h3>
            <button onClick={() => { setEffectsSubTab('add'); setSelectedEffects([]); }} className="px-3 py-1 bg-green-100 text-green-700 rounded-xl text-sm">➕ Добавить эффект</button>
          </div>
          {renderCurrentEffects()}
        </div>
      ) : renderAddEffects()}
    </div>
  );
};
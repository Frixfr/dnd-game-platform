// client/src/pages/PlayerEffectsPage.tsx
import { useParams } from 'react-router-dom';
import { EffectCard } from '../components/ui/EffectCard';
import { usePlayerSessionStore } from '../stores/playerSessionStore';
import type { EffectType, PlayerItemExtended, PlayerEffectExtended } from '../types';
import { useEffect } from 'react';

export const PlayerEffectsPage = () => {
  const { playerId } = useParams();
  const { selectedPlayer } = usePlayerSessionStore();

  useEffect(() => {
    console.log("PlayerEffectsPage: selectedPlayer changed", 
      selectedPlayer?.id, 
      selectedPlayer?.active_effects?.map(e => ({ 
        id: e.id, 
        name: e.name, 
        remaining_turns: e.remaining_turns,
        remaining_days: e.remaining_days 
      }))
    );
  }, [selectedPlayer]);

  const loading = !selectedPlayer || selectedPlayer.id !== Number(playerId);
  if (loading) return <div className="text-center py-12">Загрузка эффектов...</div>;
  if (!selectedPlayer) return null;

  const allEffects: PlayerEffectExtended[] = selectedPlayer.active_effects || [];
  const raceEffects: EffectType[] = selectedPlayer.race?.effects || [];
  const raceName = selectedPlayer.race?.name || null;
  const itemPassiveEffects = (selectedPlayer.items || []).flatMap(
    (item: PlayerItemExtended) => item.passive_effects || []
  ) as (EffectType & { source_item_name: string })[];

  const passiveAbilityEffects = allEffects.filter(
    (effect) => effect.source_type === 'ability' && effect.remaining_turns === null && effect.remaining_days === null
  );
  const temporaryEffects = allEffects.filter(
    (effect) => !(effect.source_type === 'ability' && effect.remaining_turns === null && effect.remaining_days === null)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {raceEffects.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">🌿</span> Эффекты расы
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {raceEffects.map((effect, idx) => (
              <EffectCard key={`race-${effect.id}-${idx}`} effect={effect} sourceType="race" sourceName={raceName} showDescription showId={false} />
            ))}
          </div>
        </div>
      )}

      {itemPassiveEffects.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">📦</span> Пассивные эффекты предметов
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {itemPassiveEffects.map((effect, idx) => (
              <EffectCard key={`item-passive-${effect.id}-${idx}`} effect={effect} sourceType="item" sourceName={effect.source_item_name} showDescription showId={false} />
            ))}
          </div>
        </div>
      )}

      {passiveAbilityEffects.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">⚡</span> Пассивные способности
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {passiveAbilityEffects.map((effect, idx) => (
              <EffectCard key={`passive-ability-${effect.id}-${idx}`} effect={effect} sourceType="ability" sourceName={effect.source_name} showDescription showId={false} />
            ))}
          </div>
        </div>
      )}

      {temporaryEffects.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">🌀</span> Временные эффекты
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {temporaryEffects.map((effect, idx) => (
              <EffectCard key={`temporary-${effect.id}-${idx}`} effect={effect} sourceType={effect.source_type} sourceName={effect.source_name} showDescription showId={false} />
            ))}
          </div>
        </div>
      )}

      {raceEffects.length === 0 && itemPassiveEffects.length === 0 && passiveAbilityEffects.length === 0 && temporaryEffects.length === 0 && (
        <p className="text-center text-gray-500 py-12">Нет эффектов</p>
      )}
    </div>
  );
};
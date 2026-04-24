import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { EffectCard } from '../components/ui/EffectCard';
import type { EffectType, PlayerItemExtended, PlayerEffectExtended } from '../types';

export const PlayerEffectsPage = () => {
  const { playerId } = useParams();
  const [allEffects, setAllEffects] = useState<PlayerEffectExtended[]>([]);
  const [raceEffects, setRaceEffects] = useState<EffectType[]>([]);
  const [raceName, setRaceName] = useState<string | null>(null);
  const [itemPassiveEffects, setItemPassiveEffects] = useState<(EffectType & { source_item_name: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFullData = async () => {
      try {
        const response = await fetch(`/api/players/${playerId}/details`);
        if (!response.ok) throw new Error();
        const data = await response.json();
        setAllEffects(data.active_effects || []);
        setRaceEffects(data.race?.effects || []);
        setRaceName(data.race?.name || null);
        const passiveEffects = (data.items || []).flatMap((item: PlayerItemExtended) => item.passive_effects || []) as (EffectType & { source_item_name: string })[];
        setItemPassiveEffects(passiveEffects);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFullData();
  }, [playerId]);

  // Разделяем эффекты от пассивных способностей и временные
  const passiveAbilityEffects = allEffects.filter(
    (effect) => effect.source_type === 'ability' && effect.remaining_turns === null && effect.remaining_days === null
  );
  const temporaryEffects = allEffects.filter(
    (effect) => !(effect.source_type === 'ability' && effect.remaining_turns === null && effect.remaining_days === null)
  );

  if (loading) return <div className="text-center py-12">Загрузка эффектов...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Расовые эффекты */}
      {raceEffects.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">🌿</span> Эффекты расы
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {raceEffects.map((effect, idx) => (
              <EffectCard key={`race-${effect.id}-${idx}`} effect={effect} sourceType="race" sourceName={raceName} showDescription />
            ))}
          </div>
        </div>
      )}

      {/* Пассивные эффекты предметов */}
      {itemPassiveEffects.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">📦</span> Пассивные эффекты предметов
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {itemPassiveEffects.map((effect, idx) => (
              <EffectCard key={`item-passive-${effect.id}-${idx}`} effect={effect} sourceType="item" sourceName={effect.source_item_name} showDescription />
            ))}
          </div>
        </div>
      )}

      {/* Пассивные способности */}
      {passiveAbilityEffects.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">⚡</span> Пассивные способности
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {passiveAbilityEffects.map((effect, idx) => (
              <EffectCard key={`passive-ability-${effect.id}-${idx}`} effect={effect} sourceType="ability" sourceName={effect.source_name} showDescription />
            ))}
          </div>
        </div>
      )}

      {/* Временные эффекты */}
      {temporaryEffects.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">🌀</span> Временные эффекты
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {temporaryEffects.map((effect, idx) => (
              <EffectCard key={`temporary-${effect.id}-${idx}`} effect={effect} sourceType={effect.source_type} sourceName={effect.source_name} showDescription />
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
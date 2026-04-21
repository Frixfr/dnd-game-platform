// client/src/pages/PlayerEffectsPage.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { EffectCard } from '../components/ui/EffectCard';
import type { EffectType, PlayerType } from '../types';

export const PlayerEffectsPage = () => {
  const { playerId } = useParams();
  const [activeEffects, setActiveEffects] = useState<EffectType[]>([]);
  const [itemPassiveEffects, setItemPassiveEffects] = useState<EffectType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFullData = async () => {
      try {
        const response = await fetch(`/api/players/${playerId}/details`);
        if (!response.ok) throw new Error();
        const data: PlayerType = await response.json();
        setActiveEffects(data.active_effects || []);
        // Собираем пассивные эффекты из всех предметов (поле passive_effects)
        const passiveEffects = (data.items || []).flatMap(item => item.passive_effects || []);
        setItemPassiveEffects(passiveEffects);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFullData();
  }, [playerId]);

  if (loading) return <div className="text-center py-12">Загрузка эффектов...</div>;

  const hasAnyEffects = activeEffects.length > 0 || itemPassiveEffects.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Пассивные эффекты от предметов */}
      {itemPassiveEffects.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">📦</span> Пассивные эффекты от предметов
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {itemPassiveEffects.map((effect, idx) => (
              <EffectCard key={`item-passive-${effect.id}-${idx}`} effect={effect} showDescription />
            ))}
          </div>
        </div>
      )}

      {/* Активные (временные) эффекты */}
      {activeEffects.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">🌀</span> Временные эффекты
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeEffects.map((effect, idx) => (
              <EffectCard key={`active-${effect.id}-${idx}`} effect={effect} showDescription />
            ))}
          </div>
        </div>
      )}

      {!hasAnyEffects && (
        <p className="text-center text-gray-500 py-12">Нет эффектов</p>
      )}
    </div>
  );
};
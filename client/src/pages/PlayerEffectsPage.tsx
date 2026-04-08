// client/src/pages/PlayerEffectsPage.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { EffectCard } from '../components/ui/EffectCard';
import type { EffectType } from '../types';

export const PlayerEffectsPage = () => {
  const { playerId } = useParams();
  const [effects, setEffects] = useState<EffectType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEffects = async () => {
      try {
        const response = await fetch(`/api/players/${playerId}/details`);
        if (!response.ok) throw new Error();
        const data = await response.json();
        setEffects(data.active_effects || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEffects();
  }, [playerId]);

  if (loading) return <div className="text-center py-12">Загрузка эффектов...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      {effects.length === 0 ? (
        <p className="text-center text-gray-500 py-12">Нет активных эффектов</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {effects.map(effect => (
            <EffectCard key={effect.id} effect={effect} showDescription />
          ))}
        </div>
      )}
    </div>
  );
};
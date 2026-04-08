// client/src/pages/PlayerAbilitiesPage.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AbilityCard } from '../components/ui/AbilityCard';
import type { PlayerAbilityExtended, EffectType } from '../types';

export const PlayerAbilitiesPage = () => {
  const { playerId } = useParams();
  const [abilities, setAbilities] = useState<PlayerAbilityExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingAbilityId, setUsingAbilityId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchAbilities = async () => {
    try {
      const response = await fetch(`/api/players/${playerId}/details`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      // Приводим способности к правильному типу
      const mappedAbilities: PlayerAbilityExtended[] = (data.abilities || []).map((a: any) => ({
        ...a,
        is_active: a.is_active === 1 || a.is_active === true,
        effect: a.effect || null,
      }));
      setAbilities(mappedAbilities);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbilities();
  }, [playerId]);

  const handleUseAbility = async (abilityId: number) => {
    setUsingAbilityId(abilityId);
    setMessage(null);
    try {
      const response = await fetch(`/api/abilities/${abilityId}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: Number(playerId) }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка использования');
      }
      const result = await response.json();
      setMessage(`Способность использована! Эффект ${result.effect_applied ? 'применён' : 'не применён'}.`);
      await fetchAbilities();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setMessage(errorMessage);
    } finally {
      setUsingAbilityId(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (loading) return <div className="text-center py-12">Загрузка способностей...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      {message && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded-xl">{message}</div>
      )}
      {abilities.length === 0 ? (
        <p className="text-center text-gray-500 py-12">Нет способностей</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {abilities.map(ability => (
            <div key={ability.id} className="relative">
              <AbilityCard ability={ability} effect={ability.effect || undefined} />
              {ability.ability_type === 'active' && ability.is_active && (
                <button
                  onClick={() => handleUseAbility(ability.id)}
                  disabled={usingAbilityId === ability.id}
                  className="mt-2 w-full py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {usingAbilityId === ability.id ? 'Использование...' : 'Использовать'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
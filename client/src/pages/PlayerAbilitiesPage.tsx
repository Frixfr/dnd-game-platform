// client/src/pages/PlayerAbilitiesPage.tsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AbilityCard } from '../components/ui/AbilityCard';
import { usePlayerSessionStore } from '../stores/playerSessionStore';
import type { PlayerAbilityExtended } from '../types';

export const PlayerAbilitiesPage = () => {
  const { playerId } = useParams();
  const { selectedPlayer } = usePlayerSessionStore();
  const [usingAbilityId, setUsingAbilityId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loading = !selectedPlayer || selectedPlayer.id !== Number(playerId);
  const abilities: PlayerAbilityExtended[] = selectedPlayer?.abilities || [];

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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setMessage(errorMessage);
    } finally {
      setUsingAbilityId(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (loading) return <div className="text-center py-12 text-text-primary">Загрузка способностей...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      {message && (
        <div className="mb-4 p-3 bg-bg-secondary text-text-primary rounded-xl border border-border-color">{message}</div>
      )}
      {abilities.length === 0 ? (
        <p className="text-center text-text-secondary py-12">Нет способностей</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {abilities.map((ability) => {
            const isOnCooldown = (ability.remaining_cooldown_turns ?? 0) > 0;
            const cooldownTurns = ability.remaining_cooldown_turns ?? 0;

            return (
              <div key={ability.id} className="relative">
                <AbilityCard ability={ability} effect={ability.effect || undefined} showId={false} />
                {ability.ability_type === 'active' && ability.is_active && (
                  <div className="mt-2">
                    {isOnCooldown && (
                      <div className="text-sm text-orange-400 mb-1 text-center">
                        Перезарядка: {cooldownTurns} ходов
                      </div>
                    )}
                    <button
                      onClick={() => handleUseAbility(ability.id)}
                      disabled={usingAbilityId === ability.id || isOnCooldown}
                      className={`w-full py-2 rounded-xl transition ${
                        isOnCooldown
                          ? 'bg-bg-tertiary text-text-secondary cursor-not-allowed'
                          : 'btn-secondary'
                      } disabled:opacity-50`}
                    >
                      {usingAbilityId === ability.id
                        ? 'Использование...'
                        : isOnCooldown
                        ? 'На перезарядке'
                        : 'Использовать'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
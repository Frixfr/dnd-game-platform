// client/src/pages/PlayerCharacterSheetPage.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePlayerSessionStore } from "../stores/playerSessionStore";
import {
  User,
  Heart,
  Shield,
  Swords,
  Wind,
  Brain,
  Activity,
  Eye,
  MessageCircle,
  Mars,
  Venus,
  Loader2,
  AlertCircle,
  PlusCircle,
  MinusCircle,
} from "lucide-react";
import type { PlayerType, PlayerEffectExtended, Effect, PlayerAbilityExtended, PlayerItemExtended } from "../types";
import { CollapsibleSection } from "../components/ui/CollapsibleSection";
import { ActiveEffectsWidget } from "../components/game/ActiveEffectsWidget";
import { QuickAbilitiesList } from "../components/game/QuickAbilitiesList";
import { CompactInventory } from "../components/game/CompactInventory";
import { HealDamageRequestModal } from "../components/game/HealDamageRequestModal";
import { StatWithTooltip } from "../components/game/StatWithTooltip";
import { useLocalStorage } from "../hooks/useLocalStorage";

// Тип для бонуса
interface StatBonus {
  source: string;
  value: number;
}

// Получение всех эффектов, влияющих на статы (раса + активные эффекты + пассивные эффекты предметов)
function getAllEffects(player: PlayerType | null): Effect[] {
  if (!player) return [];
  const effects: Effect[] = [];
  // Эффекты расы
  if (player.race?.effects) {
    effects.push(...player.race.effects);
  }
  // Активные эффекты (временные, от способностей/предметов/админа)
  if (player.active_effects) {
    effects.push(...(player.active_effects as Effect[]));
  }
  // Пассивные эффекты от предметов в инвентаре
  if (player.items) {
    for (const item of player.items) {
      if (item.passive_effects && Array.isArray(item.passive_effects)) {
        for (const effect of item.passive_effects) {
          // Добавляем эффект, подмешивая source_type и source_name для отображения
          const effectWithSource = { ...effect, source_type: 'item', source_name: item.name } as Effect;
          effects.push(effectWithSource);
        }
      }
    }
  }
  return effects;
}

// Сбор бонусов для конкретного атрибута
function getBonusesForStat(statKey: string, player: PlayerType | null): StatBonus[] {
  if (!player) return [];
  const bonuses: StatBonus[] = [];
  const allEffects = getAllEffects(player);
  
  for (const effect of allEffects) {
    if (effect.attribute === statKey && effect.modifier !== 0) {
      let source = effect.name;
      if ('source_type' in effect && effect.source_type) {
        const typeMap: Record<string, string> = {
          race: '🌿 Раса',
          ability: '✨ Способность',
          item: '📦 Предмет',
          admin: '👑 Мастер',
        };
        source = `${typeMap[effect.source_type as string] || 'Эффект'}: ${effect.name}`;
      } else {
        source = `🌿 Раса: ${effect.name}`;
      }
      bonuses.push({ source, value: effect.modifier });
    }
  }
  return bonuses;
}

// Формирование строки с бонусами для тултипа
function formatBonusesTooltip(bonuses: StatBonus[]): string {
  if (bonuses.length === 0) return "Нет бонусов";
  return bonuses.map(b => `${b.source}: ${b.value > 0 ? '+' : ''}${b.value}`).join('\n');
}

export const PlayerCharacterSheetPage = () => {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const { selectedPlayer, setSelectedPlayer } = usePlayerSessionStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHealModal, setShowHealModal] = useState(false);

  const [collapsedSections, setCollapsedSections] = useLocalStorage<Record<string, boolean>>(
    "playerSheetCollapsed",
    {
      effects: false,
      abilities: false,
      inventory: false,
      stats: false,
      history: false,
    },
    true, // isMobileSpecific = true
  );

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Заменяем loadFullPlayer на вариант с опциональным signal
  const loadFullPlayer = useCallback(async (signal?: AbortSignal) => {
    if (!playerId) return;
    try {
      const response = await fetch(`/api/players/${playerId}/details`, { signal });
      if (!response.ok) throw new Error("Ошибка загрузки данных персонажа");
      const fullPlayer = await response.json();
      setSelectedPlayer(fullPlayer);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }, [playerId, setSelectedPlayer]);

  // useEffect с AbortController
  useEffect(() => {
    const abortController = new AbortController();
    if (selectedPlayer && selectedPlayer.id === Number(playerId)) {
      setLoading(false);
    } else {
      loadFullPlayer(abortController.signal);
    }
    return () => abortController.abort();
  }, [playerId, selectedPlayer, loadFullPlayer]);

  // refreshPlayer без abort (можно оставить как было, но loadFullPlayer не требует сигнала)
  const refreshPlayer = useCallback(async () => {
    setLoading(true);
    await loadFullPlayer(); // теперь работает, т.к. signal опциональный
  }, [loadFullPlayer]);

  // Все хуки useMemo должны быть до условных возвратов
  const statBonuses = useMemo(() => ({
    strength: getBonusesForStat('strength', selectedPlayer),
    agility: getBonusesForStat('agility', selectedPlayer),
    intelligence: getBonusesForStat('intelligence', selectedPlayer),
    physique: getBonusesForStat('physique', selectedPlayer),
    wisdom: getBonusesForStat('wisdom', selectedPlayer),
    charisma: getBonusesForStat('charisma', selectedPlayer),
    health: getBonusesForStat('health', selectedPlayer),
    max_health: getBonusesForStat('max_health', selectedPlayer),
    armor: getBonusesForStat('armor', selectedPlayer),
  }), [selectedPlayer]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <Loader2 className="w-16 h-16 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (error || !selectedPlayer) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center bg-gray-800/80 p-8 rounded-2xl border border-red-500/30">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-300 mb-4">{error || "Персонаж не найден"}</p>
          <button
            onClick={() => navigate("/player/select")}
            className="px-6 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg"
          >
            Выбрать персонажа
          </button>
        </div>
      </div>
    );
  }

  const player = selectedPlayer;
  const finalStats = player.final_stats || {
    health: player.health,
    max_health: player.max_health,
    armor: player.armor,
    strength: player.strength,
    agility: player.agility,
    intelligence: player.intelligence,
    physique: player.physique,
    wisdom: player.wisdom,
    charisma: player.charisma,
  };

  const baseStats = {
    health: player.health,
    max_health: player.max_health,
    armor: player.armor,
    strength: player.strength,
    agility: player.agility,
    intelligence: player.intelligence,
    physique: player.physique,
    wisdom: player.wisdom,
    charisma: player.charisma,
  };

  const healthDiff = finalStats.max_health - baseStats.max_health;
  const healthBonuses = statBonuses.max_health;
  const currentHealthDiff = finalStats.health - baseStats.health;
  const armorDiff = finalStats.armor - baseStats.armor;
  const armorBonuses = statBonuses.armor;

  const GenderIcon = player.gender === "male" ? Mars : Venus;
  const initials = player.name.slice(0, 2).toUpperCase();
  const healthPercent = (finalStats.health / finalStats.max_health) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-6 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-amber-500/30 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            <div className="relative">
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-full ring-4 ring-amber-500/50 bg-gray-700 flex items-center justify-center overflow-hidden">
                {player.avatar_url ? (
                  <img src={player.avatar_url} alt={player.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl md:text-5xl font-bold text-amber-400">{initials}</span>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-gray-800 rounded-full p-1.5 ring-1 ring-amber-500/50">
                <GenderIcon size={20} className={player.gender === "male" ? "text-sky-400" : "text-rose-400"} />
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent">
                {player.name}
              </h1>
              <div className="flex flex-wrap gap-2 mt-2 justify-center md:justify-start">
                {player.race && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-900/40 rounded-full text-xs text-amber-200">
                    <User size={12} /> {player.race.name}
                  </span>
                )}
                {player.in_battle && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-900/40 rounded-full text-xs text-red-200">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" /> В бою
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Левая колонка */}
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Здоровье с тултипом и базой */}
              <div className="bg-gray-800/60 rounded-2xl border border-amber-500/20 p-4">
                <div className="flex items-center gap-2 text-amber-400 mb-2">
                  <Heart size={20} fill="currentColor" />
                  <span className="font-semibold">Здоровье</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white">{finalStats.health}</span>
                  <span className="text-gray-400">/</span>
                  <span className="text-xl text-gray-300">{finalStats.max_health}</span>
                  {healthDiff !== 0 && (
                    <span
                      className="text-sm text-amber-400 ml-1 cursor-help border-b border-dotted border-amber-400"
                      title={formatBonusesTooltip(healthBonuses)}
                    >
                      ({healthDiff > 0 ? '+' : ''}{healthDiff})
                    </span>
                  )}
                  {currentHealthDiff !== 0 && currentHealthDiff !== healthDiff && (
                    <span
                      className="text-sm text-amber-400 ml-1 cursor-help border-b border-dotted border-amber-400"
                      title="Текущее здоровье изменено отдельно (не от эффектов)"
                    >
                      (тек: {currentHealthDiff > 0 ? '+' : ''}{currentHealthDiff})
                    </span>
                  )}
                </div>
                <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all" style={{ width: `${healthPercent}%` }} />
                </div>
                {/* База максимального здоровья */}
                <div className="text-xs text-gray-500 mt-2">
                  база макс. здоровья: {baseStats.max_health}
                  {healthDiff !== 0 && ` + ${healthDiff}`}
                </div>
              </div>

              {/* Класс брони с тултипом и базой */}
              <div className="bg-gray-800/60 rounded-2xl border border-amber-500/20 p-4">
                <div className="flex items-center gap-2 text-amber-400 mb-2">
                  <Shield size={20} />
                  <span className="font-semibold">Класс брони</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">{finalStats.armor}</span>
                  {armorDiff !== 0 && (
                    <span
                      className="text-sm text-amber-400 cursor-help border-b border-dotted border-amber-400"
                      title={formatBonusesTooltip(armorBonuses)}
                    >
                      ({armorDiff > 0 ? '+' : ''}{armorDiff})
                    </span>
                  )}
                </div>
                {/* База брони */}
                <div className="text-xs text-gray-500 mt-2">
                  база: {baseStats.armor}
                  {armorDiff !== 0 && ` + ${armorDiff}`}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowHealModal(true)}
              className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-amber-300 transition-colors flex items-center justify-center gap-2"
            >
              <PlusCircle size={16} /> Запросить лечение/урон <MinusCircle size={16} />
            </button>

            <CollapsibleSection
              title="Характеристики"
              defaultExpanded={!collapsedSections.stats}
              onToggle={() => toggleSection("stats")}
            >
              <div className="grid grid-cols-2 gap-3">
                <StatWithTooltip
                  label="Сила"
                  baseValue={baseStats.strength}
                  finalValue={finalStats.strength}
                  icon={<Swords size={16} className="text-orange-400" />}
                  bonuses={statBonuses.strength}
                />
                <StatWithTooltip
                  label="Ловкость"
                  baseValue={baseStats.agility}
                  finalValue={finalStats.agility}
                  icon={<Wind size={16} className="text-green-400" />}
                  bonuses={statBonuses.agility}
                />
                <StatWithTooltip
                  label="Интеллект"
                  baseValue={baseStats.intelligence}
                  finalValue={finalStats.intelligence}
                  icon={<Brain size={16} className="text-blue-400" />}
                  bonuses={statBonuses.intelligence}
                />
                <StatWithTooltip
                  label="Телосложение"
                  baseValue={baseStats.physique}
                  finalValue={finalStats.physique}
                  icon={<Activity size={16} className="text-purple-400" />}
                  bonuses={statBonuses.physique}
                />
                <StatWithTooltip
                  label="Мудрость"
                  baseValue={baseStats.wisdom}
                  finalValue={finalStats.wisdom}
                  icon={<Eye size={16} className="text-teal-400" />}
                  bonuses={statBonuses.wisdom}
                />
                <StatWithTooltip
                  label="Харизма"
                  baseValue={baseStats.charisma}
                  finalValue={finalStats.charisma}
                  icon={<MessageCircle size={16} className="text-pink-400" />}
                  bonuses={statBonuses.charisma}
                />
              </div>
            </CollapsibleSection>

            {player.history && (
              <CollapsibleSection
                title="История"
                defaultExpanded={!collapsedSections.history}
                onToggle={() => toggleSection("history")}
              >
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{player.history}</p>
              </CollapsibleSection>
            )}
          </div>

          {/* Правая колонка */}
          <div className="space-y-6">
            <CollapsibleSection
              title="Активные эффекты"
              defaultExpanded={!collapsedSections.effects}
              onToggle={() => toggleSection("effects")}
              headerRight={player.active_effects?.filter(e => e.remaining_turns || e.remaining_days).length}
            >
              <ActiveEffectsWidget effects={player.active_effects as PlayerEffectExtended[] || []} />
            </CollapsibleSection>

            <CollapsibleSection
              title="Способности"
              defaultExpanded={!collapsedSections.abilities}
              onToggle={() => toggleSection("abilities")}
              headerRight={player.abilities?.filter(a => a.ability_type === "active" && a.is_active).length}
            >
              <QuickAbilitiesList
                abilities={player.abilities as PlayerAbilityExtended[] || []}
                playerId={player.id}
                onUseAbility={refreshPlayer}
              />
            </CollapsibleSection>

            <CollapsibleSection
              title="Инвентарь"
              defaultExpanded={!collapsedSections.inventory}
              onToggle={() => toggleSection("inventory")}
              headerRight={player.items?.length}
            >
              <CompactInventory
                items={player.items as PlayerItemExtended[] || []}
                playerId={player.id}
                onRefresh={refreshPlayer}
              />
            </CollapsibleSection>
          </div>
        </div>

        {showHealModal && (
          <HealDamageRequestModal
            playerId={player.id}
            playerName={player.name}
            onClose={() => setShowHealModal(false)}
          />
        )}
      </div>
    </div>
  );
};
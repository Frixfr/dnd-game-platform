import { useEffect, useState } from "react";
import { useCombatStore } from "../stores/combatStore";
import { usePlayerStore } from "../stores/playerStore";
import { useNpcStore } from "../stores/npcStore";
import { CombatantCard } from "../components/ui/CombatantCard";
import type { EffectType } from "../types";

export const CombatPage = () => {
  const {
    session,
    participants,
    loading,
    initializeSocket,
    fetchActiveSession,
    startNewSession,
    addParticipant,
    removeParticipant,
    reorderParticipants,
    endRound,
    updateHealth,
    nextTurn,
  } = useCombatStore();
  const { players, fetchPlayers } = usePlayerStore();
  const { npcs, fetchNpcs } = useNpcStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState<{
    participantId: number;
    entityType: "player" | "npc";
    entityId: number;
  } | null>(null);
  const [effectsList, setEffectsList] = useState<EffectType[]>([]);
  const [effectSearch, setEffectSearch] = useState("");
  const filteredEffects = effectsList.filter(effect => {
    const searchLower = effectSearch.toLowerCase();
    const nameMatch = effect.name.toLowerCase().includes(searchLower);
    const tagsMatch = effect.tags?.some(tag => tag.toLowerCase().includes(searchLower)) || false;
    return nameMatch || tagsMatch;
});
  const { callUseAbility } = useCombatStore();

  useEffect(() => {
    initializeSocket();
    fetchActiveSession();
    fetchPlayers();
    fetchNpcs();
    fetch("/api/effects")
      .then((res) => res.json())
      .then(setEffectsList);
  }, [initializeSocket, fetchActiveSession, fetchPlayers, fetchNpcs]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const draggedId = parseInt(e.dataTransfer.getData("text/plain"));
    const currentOrder = [...participants];
    const draggedIndex = currentOrder.findIndex((p) => p.id === draggedId);
    if (draggedIndex === -1) return;
    const [removed] = currentOrder.splice(draggedIndex, 1);
    currentOrder.splice(targetIndex, 0, removed);
    const newIds = currentOrder.map((p) => p.id);
    reorderParticipants(newIds);
  };

  const availablePlayers = players.filter(
    (p) => !participants.some((part) => part.entity_type === "player" && part.entity_id === p.id)
  );
  const availableNpcs = npcs.filter(
    (n) => !participants.some((part) => part.entity_type === "npc" && part.entity_id === n.id)
  );

  const handleAddParticipant = async (entityType: "player" | "npc", entityId: number) => {
    await addParticipant(entityType, entityId);
    setShowAddModal(false);
  };

  const handleHealthChange = async (participant: typeof participants[0], newHealth: number) => {
    await updateHealth(participant.entity_type, participant.entity_id, newHealth);
  };

  const handleAddEffect = (participant: typeof participants[0]) => {
    setSelectedEffect({
      participantId: participant.id,
      entityType: participant.entity_type,
      entityId: participant.entity_id,
    });
  };

  const handleEffectSubmit = async (effectId: number, durationTurns?: number) => {
    if (!selectedEffect) return;
    await useCombatStore.getState().addEffect(
      selectedEffect.entityType,
      selectedEffect.entityId,
      effectId,
      durationTurns
    );
    setSelectedEffect(null);
  };

  if (loading) {
    return <div className="p-6 text-center">Загрузка боя...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">⚔️ Бой</h1>
        <div className="flex gap-3">
          {!session ? (
            <button
              onClick={startNewSession}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Начать битву
            </button>
          ) : (
            <>              
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Добавить участника
              </button>
              <button
                onClick={nextTurn}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                Передать ход
              </button>
              <button
                onClick={endRound}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Завершить раунд
              </button>
            </>
          )}
        </div>
      </div>

      {!session ? (
        <div className="text-center py-12 text-gray-500">
          Нет активной битвы. Нажмите «Начать битву»
        </div>
      ) : participants.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Нет участников. Добавьте игроков или NPC
        </div>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          onDragOver={handleDragOver}
        >
          {participants.map((participant, idx) => (
            <div
              key={participant.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, idx)}
            >
              <CombatantCard
                participant={participant}
                isCurrentTurn={participant.is_current_turn}
                onHealthChange={(newHealth) => handleHealthChange(participant, newHealth)}
                onAddEffect={() => handleAddEffect(participant)}
                onRemove={() => removeParticipant(participant.id)}
                onUseAbility={async (abilityId) => {
                    if (participant.entity_type === "npc") {
                    await callUseAbility(participant.entity_type, participant.entity_id, abilityId);
                    } else {
                    alert("Игрок сам использует свои способности через свой интерфейс");
                    }
                }}
                />
            </div>
          ))}
        </div>
      )}

      {/* Модалка добавления участника */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Добавить участника</h2>
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Игроки</h3>
              {availablePlayers.length === 0 ? (
                <p className="text-gray-500">Нет доступных игроков</p>
              ) : (
                availablePlayers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleAddParticipant("player", p.id)}
                    className="block w-full text-left p-2 hover:bg-gray-100 rounded"
                  >
                    {p.name} (❤️ {p.health}/{p.max_health})
                  </button>
                ))
              )}
            </div>
            <div className="mb-4">
              <h3 className="font-semibold mb-2">NPC</h3>
              {availableNpcs.length === 0 ? (
                <p className="text-gray-500">Нет доступных NPC</p>
              ) : (
                availableNpcs.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleAddParticipant("npc", n.id)}
                    className="block w-full text-left p-2 hover:bg-gray-100 rounded"
                  >
                    {n.name} (❤️ {n.health}/{n.max_health})
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => setShowAddModal(false)}
              className="mt-2 px-4 py-2 bg-gray-300 rounded"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Модалка добавления эффекта */}
      {selectedEffect && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Добавить эффект</h2>
            <input
                type="text"
                placeholder="Поиск по названию или тегам..."
                value={effectSearch}
                onChange={(e) => setEffectSearch(e.target.value)}
                className="w-full px-3 py-2 border rounded mb-3"
            />
            <div className="max-h-96 overflow-y-auto">
                {filteredEffects.map((effect) => (
                <div key={effect.id} className="mb-2 p-2 border rounded">
                    <div className="font-semibold">{effect.name}</div>
                    <div className="text-sm text-gray-600">{effect.description}</div>
                    {effect.tags && effect.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {effect.tags.map(tag => (
                        <span key={tag} className="text-xs bg-gray-100 px-1 rounded">#{tag}</span>
                        ))}
                    </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                    {effect.duration_turns ? `${effect.duration_turns} ходов` : "Постоянный"}
                    </div>
                    <button
                    onClick={() => handleEffectSubmit(effect.id, effect.duration_turns ?? undefined)}
                    className="mt-2 px-3 py-1 bg-purple-600 text-white text-sm rounded"
                    >
                    Применить
                    </button>
                </div>
                ))}
            </div>
            <button onClick={() => setSelectedEffect(null)} className="mt-4 px-4 py-2 bg-gray-300 rounded">
                Отмена
            </button>
            </div>
        </div>
        )}
    </div>
  );
};
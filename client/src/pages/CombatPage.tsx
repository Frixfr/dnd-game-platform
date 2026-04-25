import { useEffect, useState } from "react";
import { useCombatStore } from "../stores/combatStore";
import { usePlayerStore } from "../stores/playerStore";
import { useNpcStore } from "../stores/npcStore";
import { CombatantCard } from "../components/ui/CombatantCard";
import { EditPlayerModal } from "../components/ui/EditPlayerModal";
import { EditNpcModal } from "../components/ui/EditNpcModal";
import type { PlayerType, NpcType } from "../types";

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
    nextTurn,
    advanceDay,
  } = useCombatStore();
  const { players, fetchPlayers } = usePlayerStore();
  const { npcs, fetchNpcs } = useNpcStore();
  const [showAddModal, setShowAddModal] = useState(false);

  // Состояние для редактируемого участника
  const [editingParticipant, setEditingParticipant] = useState<{
    participant: typeof participants[0];
  } | null>(null);

  useEffect(() => {
    initializeSocket();
    fetchActiveSession();
    fetchPlayers();
    fetchNpcs();
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

  const handleRemoveParticipant = async (participantId: number) => {
    await removeParticipant(participantId);
  };

  const handleEditParticipant = (participant: typeof participants[0]) => {
    setEditingParticipant({ participant });
  };

  const handleEntityUpdated = async () => {
    await fetchActiveSession(); // перезагружаем бой, чтобы обновить характеристики в карточке
    setEditingParticipant(null);
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
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Передать ход
              </button>
              <button
                onClick={advanceDay}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Завершить день
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
                onRemove={() => handleRemoveParticipant(participant.id)}
                onEdit={() => handleEditParticipant(participant)}
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

      {/* Модалка редактирования игрока/NPC */}
      {editingParticipant && (
        editingParticipant.participant.entity_type === "player" ? (
          <EditPlayerModal
            player={editingParticipant.participant.entity as PlayerType}
            onClose={() => setEditingParticipant(null)}
            onPlayerUpdated={handleEntityUpdated}
          />
        ) : (
          <EditNpcModal
            npc={editingParticipant.participant.entity as NpcType}
            onClose={() => setEditingParticipant(null)}
            onNpcUpdated={handleEntityUpdated}
          />
        )
      )}
    </div>
  );
};
import { useEffect, useState } from "react";
import { useCombatStore } from "../stores/combatStore";
import { usePlayerStore } from "../stores/playerStore";
import { useNpcStore } from "../stores/npcStore";
import { CombatantCard } from "../components/ui/CombatantCard";
import { EditPlayerModal } from "../components/ui/EditPlayerModal";
import { EditNpcModal } from "../components/ui/EditNpcModal";
import AddCombatantModal from "../components/ui/AddCombatantModal"; // импорт новой модалки
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

  // Перемещение участника кнопками (тач-альтернатива drag-and-drop)
  const moveParticipant = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === participants.length - 1) return;
    const currentOrder = [...participants];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [currentOrder[index], currentOrder[targetIndex]] = [currentOrder[targetIndex], currentOrder[index]];
    reorderParticipants(currentOrder.map((p) => p.id));
  };

  const availablePlayers = players.filter(
    (p) => p.is_online && !participants.some((part) => part.entity_type === "player" && part.entity_id === p.id)
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">⚔️ Бой</h1>
        <div className="flex flex-wrap gap-2">
          {!session ? (
            <button
              onClick={startNewSession}
              className="flex-1 sm:flex-none px-4 py-2 btn-primary"
            >
              Начать битву
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex-1 sm:flex-none px-4 py-2 btn-secondary"
              >
                + Добавить участника
              </button>
              <button
                onClick={nextTurn}
                className="flex-1 sm:flex-none px-4 py-2 btn-secondary"
              >
                Передать ход
              </button>
              <button
                onClick={advanceDay}
                className="flex-1 sm:flex-none px-4 py-2 btn-secondary"
              >
                Завершить день
              </button>
            </>
          )}
        </div>
      </div>

      {!session ? (
        <div className="text-center py-12 text-text-muted bg-card rounded-lg border border-border-color p-4">
          Нет активной битвы. Нажмите «Начать битву»
        </div>
      ) : participants.length === 0 ? (
        <div className="text-center py-12 text-text-muted bg-card rounded-lg border border-border-color p-4">
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
                onMoveUp={idx > 0 ? () => moveParticipant(idx, "up") : undefined}
                onMoveDown={idx < participants.length - 1 ? () => moveParticipant(idx, "down") : undefined}
              />
            </div>
          ))}
        </div>
      )}

      {/* Красивая модалка добавления участника */}
      <AddCombatantModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        availablePlayers={availablePlayers}
        availableNpcs={availableNpcs}
        onAddPlayer={(playerId) => handleAddParticipant("player", playerId)}
        onAddNpc={(npcId) => handleAddParticipant("npc", npcId)}
      />

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
// client/src/components/ui/CombatantCard.tsx
import type { CombatParticipantWithDetails } from "../../types";

interface CombatantCardProps {
  participant: CombatParticipantWithDetails;
  isCurrentTurn: boolean;
  onRemove: () => void;
  onEdit: () => void;
}

export const CombatantCard = ({ participant, isCurrentTurn, onRemove, onEdit }: CombatantCardProps) => {
  const entity = participant.entity;
  const healthPercent = (entity.health / entity.max_health) * 100;
  const isDead = entity.health <= 0;
  const entityName = entity.name;
  const entityTypeLabel = participant.entity_type === "player" ? "Игрок" : "NPC";
  const avatarUrl = entity.avatar_url;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    onEdit();
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("text/plain", participant.id.toString());
    (e.currentTarget as HTMLElement).style.opacity = "0.5";
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLElement).style.opacity = "1";
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-md p-4 transition-all cursor-grab active:cursor-grabbing ${
        isCurrentTurn ? "ring-2 ring-blue-500 shadow-lg" : ""
      } ${isDead ? "bg-gray-300 opacity-70" : ""}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={entityName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl">
              {participant.entity_type === "player" ? "👤" : "👹"}
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-gray-800">{entityName}</h3>
              <span className="text-xs text-gray-500">{entityTypeLabel}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="text-gray-400 hover:text-red-500 text-xl leading-none"
              title="Удалить из боя"
            >
              ×
            </button>
          </div>

          <div className="mt-1 flex justify-between items-center text-sm">
            <span className="text-gray-600">🛡️ Броня</span>
            <span className="font-semibold">{entity.armor}</span>
          </div>

          <div className="mt-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>❤️ Здоровье</span>
              <span>
                {entity.health}/{entity.max_health}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-red-500 transition-all"
                style={{ width: `${Math.max(0, healthPercent)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      {isCurrentTurn && (
        <div className="mt-2 text-xs text-blue-600 font-semibold text-center">▶ Текущий ход</div>
      )}
    </div>
  );
};
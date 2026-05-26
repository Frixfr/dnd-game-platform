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
      className={`bg-card rounded-xl shadow-lg p-4 transition-all cursor-grab active:cursor-grabbing border border-border-color ${
        isCurrentTurn ? "ring-2 ring-accent-red shadow-xl" : ""
      } ${isDead ? "bg-bg-secondary opacity-70" : ""}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-bg-secondary overflow-hidden flex-shrink-0 border border-border-color">
          {avatarUrl ? (
            <img src={avatarUrl} alt={entityName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-secondary text-xl">
              {participant.entity_type === "player" ? "👤" : "👹"}
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-text-primary">{entityName}</h3>
              <span className="text-xs text-text-secondary">{entityTypeLabel}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="text-text-secondary hover:text-accent-red text-xl leading-none"
              title="Удалить из боя"
            >
              ×
            </button>
          </div>

          <div className="mt-1 flex justify-between items-center text-sm">
            <span className="text-text-secondary">🛡️ Броня</span>
            <span className="font-semibold text-text-primary">{entity.armor}</span>
          </div>

          <div className="mt-2">
            <div className="flex justify-between text-sm text-text-secondary">
              <span>❤️ Здоровье</span>
              <span className="text-text-primary">
                {entity.health}/{entity.max_health}
              </span>
            </div>
            <div className="h-2 bg-bg-secondary rounded-full overflow-hidden mt-1 border border-border-color">
              <div
                className="h-full bg-red-500 transition-all"
                style={{ width: `${Math.max(0, healthPercent)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      {isCurrentTurn && (
        <div className="mt-2 text-xs text-accent-red font-semibold text-center">▶ Текущий ход</div>
      )}
    </div>
  );
};
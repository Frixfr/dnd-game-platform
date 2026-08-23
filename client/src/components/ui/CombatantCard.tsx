// client/src/components/ui/CombatantCard.tsx
import type { CombatParticipantWithDetails } from "../../types";

interface CombatantCardProps {
  participant: CombatParticipantWithDetails;
  isCurrentTurn: boolean;
  onRemove: () => void;
  onEdit: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export const CombatantCard = ({ participant, isCurrentTurn, onRemove, onEdit, onMoveUp, onMoveDown }: CombatantCardProps) => {
  const entity = participant.entity;
  const baseMaxHealth = entity.max_health;           // базовое из таблицы
  const finalMaxHealth = entity.final_stats?.max_health ?? baseMaxHealth;
  const bonus = finalMaxHealth - baseMaxHealth;
  const healthPercent = (entity.health / finalMaxHealth) * 100;
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
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-text-primary truncate">{entityName}</h3>
              <span className="text-xs text-text-secondary">{entityTypeLabel}</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {onMoveUp && (
                <button
                  onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
                  className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-accent-red hover:bg-accent-red/10 rounded-full transition-colors"
                  title="Поднять в порядке"
                >
                  ▲
                </button>
              )}
              {onMoveDown && (
                <button
                  onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
                  className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-accent-red hover:bg-accent-red/10 rounded-full transition-colors"
                  title="Опустить в порядке"
                >
                  ▼
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-accent-red hover:bg-accent-red/10 rounded-full transition-colors text-xl leading-none"
                title="Удалить из боя"
              >
                ×
              </button>
            </div>
          </div>

          <div className="mt-1 flex justify-between items-center text-sm">
            <span className="text-text-secondary">🛡️ Броня</span>
            <span className="font-semibold text-text-primary">{entity.armor}</span>
          </div>

          <div className="mt-2">
            <div className="flex justify-between text-sm text-text-secondary">
              <span>❤️ Здоровье</span>
              <span className="text-text-primary">
                {entity.health}/{baseMaxHealth}
                {bonus !== 0 && <span className="text-xs text-text-secondary ml-1">(+{bonus})</span>}
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
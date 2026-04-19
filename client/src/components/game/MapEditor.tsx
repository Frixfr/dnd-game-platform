// client/src/components/game/MapEditor.tsx
import React, { useRef, useState, useEffect } from "react";
import { useMapStore } from "../../stores/mapStore";
import { socket } from "../../lib/socket";
import type { MapWithTokensType, MapTokenType, AvailableEntities } from "../../types";

interface MapEditorProps {
  map: MapWithTokensType;
}

export const MapEditor: React.FC<MapEditorProps> = ({ map }) => {
  const { updateToken, deleteToken, getAvailableEntities } = useMapStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [entities, setEntities] = useState<AvailableEntities | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; token: MapTokenType } | null>(null);



  // Подписка на комнату карты для получения обновлений в реальном времени
  useEffect(() => {
    socket.emit("join-map", map.id);
    return () => {
        socket.emit("leave-map", map.id);
    };
    }, [map.id]);

  useEffect(() => {
    getAvailableEntities().then(setEntities);
  }, [getAvailableEntities]);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;
    if (!entities) return;

    const entityTypeRaw = window.prompt("Добавить игрока (player) или NPC (npc)?", "player");
    if (!entityTypeRaw) return;
    if (entityTypeRaw !== "player" && entityTypeRaw !== "npc") {
      alert("Некорректный тип. Введите 'player' или 'npc'");
      return;
    }
    const entityType = entityTypeRaw as "player" | "npc";

    const list = entityType === "player" ? entities.players : entities.npcs;
    const names = list.map(e => `${e.id}: ${e.name}`).join("\n");
    const input = window.prompt(`Введите ID сущности:\n${names}`);
    if (!input) return;
    const entityId = parseInt(input);
    const found = list.find(e => e.id === entityId);
    if (!found) {
      alert("Сущность не найдена");
      return;
    }

    updateToken(map.id, {
      entity_type: entityType,
      entity_id: entityId,
      x: clickX,
      y: clickY,
      is_grayscale: false,
      scale: 1,
    });
  };

  const handleTokenDrag = (token: MapTokenType, e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startTokenX = token.x;
    const startTokenY = token.y;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const rect = containerRef.current!.getBoundingClientRect();
      const newX = Math.min(1, Math.max(0, startTokenX + dx / rect.width));
      const newY = Math.min(1, Math.max(0, startTokenY + dy / rect.height));
      updateToken(map.id, {
        entity_type: token.entity_type,
        entity_id: token.entity_id,
        x: newX,
        y: newY,
        is_grayscale: token.is_grayscale,
        scale: token.scale,
      });
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    e.preventDefault();
  };

  const handleTokenContextMenu = (token: MapTokenType, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, token });
  };

  const handleToggleGrayscale = () => {
    if (contextMenu) {
      updateToken(map.id, {
        entity_type: contextMenu.token.entity_type,
        entity_id: contextMenu.token.entity_id,
        is_grayscale: !contextMenu.token.is_grayscale,
        scale: contextMenu.token.scale,
      });
      setContextMenu(null);
    }
  };

  const handleChangeScale = (delta: number) => {
    if (contextMenu) {
      const newScale = Math.min(2, Math.max(0.5, contextMenu.token.scale + delta));
      updateToken(map.id, {
        entity_type: contextMenu.token.entity_type,
        entity_id: contextMenu.token.entity_id,
        scale: newScale,
        is_grayscale: contextMenu.token.is_grayscale,
      });
      setContextMenu(null);
    }
  };

  const handleDeleteToken = () => {
    if (contextMenu) {
      deleteToken(map.id, contextMenu.token.entity_type, contextMenu.token.entity_id);
      setContextMenu(null);
    }
  };

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      <img
        src={map.image_url}
        alt={map.name}
        className="w-full h-full object-contain select-none"
        draggable={false}
        onClick={handleImageClick}
      />
      {map.tokens.map((token) => (
        <div
          key={`${token.entity_type}-${token.entity_id}`}
          className="absolute cursor-move transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${token.x * 100}%`,
            top: `${token.y * 100}%`,
            width: `${50 * token.scale}px`,
            height: `${50 * token.scale}px`,
            filter: token.is_grayscale ? "grayscale(100%)" : "none",
          }}
          onMouseDown={(e) => handleTokenDrag(token, e)}
          onContextMenu={(e) => handleTokenContextMenu(token, e)}
        >
          <img
            src={token.avatar_url || "/default-avatar.png"}
            alt={token.entity_name}
            className="w-full h-full rounded-full border-2 border-white shadow-md object-cover"
            draggable={false}
          />
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white text-xs px-1 rounded whitespace-nowrap">
            {token.entity_name}
          </div>
        </div>
      ))}
      {contextMenu && (
        <div
          className="fixed bg-white border shadow-md rounded z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <ul className="py-1">
            <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={handleToggleGrayscale}>
              {contextMenu.token.is_grayscale ? "Вернуть цвет" : "Сделать ч/б"}
            </li>
            <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleChangeScale(-0.1)}>
              Уменьшить
            </li>
            <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleChangeScale(0.1)}>
              Увеличить
            </li>
            <li className="px-4 py-2 hover:bg-red-100 cursor-pointer text-red-600" onClick={handleDeleteToken}>
              Удалить с карты
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};
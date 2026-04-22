// client/src/components/game/MapEditor.tsx
import React, { useRef, useState, useEffect } from 'react';
import { useMapStore } from '../../stores/mapStore';
import { socket } from '../../lib/socket';
import type { MapWithTokensType, AvailableEntities } from '../../types';
import { useCanvasMap } from '../../hooks/useCanvasMap';

interface MapEditorProps {
  map: MapWithTokensType;
}

export const MapEditor: React.FC<MapEditorProps> = ({ map }) => {
  const { updateToken, getAvailableEntities } = useMapStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [entities, setEntities] = useState<AvailableEntities | null>(null);

  useEffect(() => {
    socket.emit('join-map', map.id);
    return () => {
      socket.emit('leave-map', map.id);
    };
  }, [map.id]);

  useEffect(() => {
    getAvailableEntities().then(setEntities);
  }, [getAvailableEntities]);

  const handleTokenDrag = (token: MapWithTokensType['tokens'][0], newAbsX: number, newAbsY: number) => {
    updateToken(map.id, {
      entity_type: token.entity_type,
      entity_id: token.entity_id,
      x: newAbsX,
      y: newAbsY,
      is_grayscale: token.is_grayscale,
      scale: token.scale,
    });
  };

  const handleCanvasClick = async (relX: number, relY: number) => {
    if (!entities) return;
    const entityTypeRaw = window.prompt('Добавить игрока (player) или NPC (npc)?', 'player');
    if (!entityTypeRaw) return;
    if (entityTypeRaw !== 'player' && entityTypeRaw !== 'npc') {
      alert("Некорректный тип. Введите 'player' или 'npc'");
      return;
    }
    const entityType = entityTypeRaw as 'player' | 'npc';

    const list = entityType === 'player' ? entities.players : entities.npcs;
    const names = list.map(e => `${e.id}: ${e.name}`).join('\n');
    const input = window.prompt(`Введите ID сущности:\n${names}`);
    if (!input) return;
    const entityId = parseInt(input);
    const found = list.find(e => e.id === entityId);
    if (!found) {
      alert('Сущность не найдена');
      return;
    }

    const absX = relX * map.original_width;
    const absY = relY * map.original_height;
    updateToken(map.id, {
      entity_type: entityType,
      entity_id: entityId,
      x: absX,
      y: absY,
      is_grayscale: false,
      scale: 1,
    });
  };

  useCanvasMap(canvasRef, {
    mapImageUrl: map.image_url,
    tokens: map.tokens,
    originalWidth: map.original_width,
    originalHeight: map.original_height,
    onTokenDrag: handleTokenDrag,
    onCanvasClick: handleCanvasClick,
  });

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full cursor-grab" />
    </div>
  );
};
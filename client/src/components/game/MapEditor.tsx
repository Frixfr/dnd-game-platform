// client/src/components/game/MapEditor.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useMapStore } from '../../stores/mapStore';
import { socket } from '../../lib/socket';
import type { MapWithTokensType, AvailableEntities } from '../../types';
import { useCanvasMap } from '../../hooks/useCanvasMap';

interface MapEditorInnerProps {
  map: MapWithTokensType;
  entities: AvailableEntities | null;
  onUpdateToken: (
    entity_type: string,
    entity_id: number,
    x: number,
    y: number,
    scale?: number,
    is_grayscale?: boolean,
  ) => void;
  onDeleteToken: (entity_type: string, entity_id: number) => void;
}

// Внутренний компонент, который рендерится только когда есть map
const MapEditorInner: React.FC<MapEditorInnerProps> = ({ map, entities, onUpdateToken, onDeleteToken }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    token: MapWithTokensType['tokens'][0];
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleCanvasContextMenu = useCallback(async (relX: number, relY: number) => {
    console.log('[MapEditor] Right click on canvas', { relX, relY, originalWidth: map.original_width, originalHeight: map.original_height });
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
    console.log('[MapEditor] Creating token at absolute coords', { absX, absY });
    onUpdateToken(entityType, entityId, absX, absY, 1, false);
  }, [entities, map.original_width, map.original_height, onUpdateToken]);

  const handleTokenContextMenu = useCallback((
    token: MapWithTokensType['tokens'][0],
    clientX: number,
    clientY: number,
  ) => {
    setContextMenu({ token, x: clientX, y: clientY });
  }, []);

  const handleTokenDrag = useCallback((token: MapWithTokensType['tokens'][0], newAbsX: number, newAbsY: number) => {
    onUpdateToken(token.entity_type, token.entity_id, newAbsX, newAbsY, token.scale, token.is_grayscale);
  }, [onUpdateToken]);

  const increaseScale = () => {
    if (!contextMenu) return;
    const newScale = Math.min(2, contextMenu.token.scale + 0.1);
    onUpdateToken(
      contextMenu.token.entity_type,
      contextMenu.token.entity_id,
      contextMenu.token.x,
      contextMenu.token.y,
      newScale,
      contextMenu.token.is_grayscale,
    );
    setContextMenu(null);
  };

  const decreaseScale = () => {
    if (!contextMenu) return;
    const newScale = Math.max(0.5, contextMenu.token.scale - 0.1);
    onUpdateToken(
      contextMenu.token.entity_type,
      contextMenu.token.entity_id,
      contextMenu.token.x,
      contextMenu.token.y,
      newScale,
      contextMenu.token.is_grayscale,
    );
    setContextMenu(null);
  };

  const toggleGrayscale = () => {
    if (!contextMenu) return;
    onUpdateToken(
      contextMenu.token.entity_type,
      contextMenu.token.entity_id,
      contextMenu.token.x,
      contextMenu.token.y,
      contextMenu.token.scale,
      !contextMenu.token.is_grayscale,
    );
    setContextMenu(null);
  };

  const deleteTokenHandler = () => {
    if (!contextMenu) return;
    if (confirm(`Удалить токен "${contextMenu.token.entity_name}"?`)) {
      onDeleteToken(contextMenu.token.entity_type, contextMenu.token.entity_id);
    }
    setContextMenu(null);
  };

  useCanvasMap(canvasRef, {
    mapImageUrl: map.image_url,
    tokens: map.tokens,
    originalWidth: map.original_width,
    originalHeight: map.original_height,
    onTokenDrag: handleTokenDrag,
    onCanvasContextMenu: handleCanvasContextMenu,
    onTokenContextMenu: handleTokenContextMenu,
  });

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full cursor-grab" />
      {contextMenu && (
        <div
          className="fixed z-50 bg-gray-800 border border-gray-600 rounded shadow-lg py-1 min-w-[150px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
            onClick={increaseScale}
          >
            Увеличить (+)
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
            onClick={decreaseScale}
          >
            Уменьшить (-)
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
            onClick={toggleGrayscale}
          >
            {contextMenu.token.is_grayscale ? 'Цветной' : 'Ч/Б'}
          </button>
          <hr className="my-1 border-gray-600" />
          <button
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
            onClick={deleteTokenHandler}
          >
            Удалить
          </button>
        </div>
      )}
    </div>
  );
};

// Основной компонент
export const MapEditor: React.FC<{ mapId: number }> = ({ mapId }) => {
  const { currentMap, updateToken, deleteToken, getAvailableEntities, fetchMap } = useMapStore();
  const [entities, setEntities] = useState<AvailableEntities | null>(null);
  const map = currentMap?.id === mapId ? currentMap : null;

  useEffect(() => {
    if (!map && mapId) {
      fetchMap(mapId);
    }
  }, [mapId, map, fetchMap]);

  useEffect(() => {
    if (!map) return;
    socket.emit('join-map', map.id);
    return () => {
      socket.emit('leave-map', map.id);
    };
  }, [map]);

  useEffect(() => {
    getAvailableEntities().then(setEntities);
  }, [getAvailableEntities]);

  const handleUpdateToken = useCallback(async (
    entity_type: string,
    entity_id: number,
    x: number,
    y: number,
    scale?: number,
    is_grayscale?: boolean,
  ) => {
    if (!map) return;
    await updateToken(map.id, {
      entity_type: entity_type as 'player' | 'npc',
      entity_id,
      x,
      y,
      is_grayscale: is_grayscale ?? false,
      scale: scale ?? 1,
    });
    // Принудительно обновляем карту, чтобы сразу увидеть изменения
    await fetchMap(map.id);
  }, [map, updateToken, fetchMap]);

  const handleDeleteToken = useCallback(async (entity_type: string, entity_id: number) => {
    if (!map) return;
    await deleteToken(map.id, entity_type, entity_id);
    await fetchMap(map.id);
  }, [map, deleteToken, fetchMap]);

  if (!map) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Загрузка карты...
      </div>
    );
  }

  return (
    <MapEditorInner
      map={map}
      entities={entities}
      onUpdateToken={handleUpdateToken}
      onDeleteToken={handleDeleteToken}
    />
  );
};
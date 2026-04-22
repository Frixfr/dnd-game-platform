// client/src/components/game/MapViewer.tsx
import React, { useRef } from 'react';
import type { MapWithTokensType } from '../../types';
import { useCanvasMap } from '../../hooks/useCanvasMap';

interface MapViewerProps {
  map: MapWithTokensType;
}

export const MapViewer: React.FC<MapViewerProps> = ({ map }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useCanvasMap(canvasRef, {
    mapImageUrl: map.image_url,
    tokens: map.tokens,
    originalWidth: map.original_width,
    originalHeight: map.original_height,
  });

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};
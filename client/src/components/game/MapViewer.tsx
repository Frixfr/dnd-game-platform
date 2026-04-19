// client/src/components/game/MapViewer.tsx
import React, { useRef } from "react";
import type { MapWithTokensType } from "../../types";

interface MapViewerProps {
  map: MapWithTokensType;
}

export const MapViewer: React.FC<MapViewerProps> = ({ map }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      <img
        src={map.image_url}
        alt={map.name}
        className="w-full h-full object-contain select-none"
        draggable={false}
      />
      {map.tokens.map((token) => (
        <div
          key={`${token.entity_type}-${token.entity_id}`}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: `${token.x * 100}%`,
            top: `${token.y * 100}%`,
            width: `${50 * token.scale}px`,
            height: `${50 * token.scale}px`,
            filter: token.is_grayscale ? "grayscale(100%)" : "none",
          }}
        >
          <img
            src={token.avatar_url || "/default-avatar.png"}
            alt={token.entity_name}
            className="w-full h-full rounded-full border-2 border-white shadow-md object-cover"
          />
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white text-xs px-1 rounded whitespace-nowrap">
            {token.entity_name}
          </div>
        </div>
      ))}
    </div>
  );
};
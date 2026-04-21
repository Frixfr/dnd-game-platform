// client/src/pages/PlayerMapPage.tsx
import { useEffect, useState } from "react";
import { useMapStore } from "../stores/mapStore";
import { MapViewer } from "../components/game/MapViewer";

export const PlayerMapPage = () => {
  const { activeMap, fetchActiveMap, initializeSocket } = useMapStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeSocket();
    const load = async () => {
      await fetchActiveMap();
      setLoading(false);
    };
    load();
  }, [initializeSocket, fetchActiveMap]);

  if (loading) return <div className="p-4 text-center">Загрузка карты...</div>;
  if (!activeMap) return <div className="p-4 text-center text-gray-500">Мастер ещё не открыл карту для игроков.</div>;

  return (
    <div className="w-full h-full min-h-[70vh] bg-gray-100 rounded overflow-hidden">
      <MapViewer map={activeMap} />
    </div>
  );
};
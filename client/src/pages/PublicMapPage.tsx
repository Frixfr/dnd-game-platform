// client/src/pages/PublicMapPage.tsx
import { useEffect, useState } from "react";
import { useMapStore } from "../stores/mapStore";
import { MapViewer } from "../components/game/MapViewer";

export const PublicMapPage = () => {
  const { activeMap, fetchActiveMap, initializeSocket } = useMapStore();
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    // Инициализация сокетов (глобально уже вызвана в App.tsx, но повторный вызов безопасен)
    initializeSocket();

    const load = async () => {
      await fetchActiveMap();
      setLoading(false);
    };
    load();

    // Опционально: перезагружать карту при фокусе страницы (если нужно)
    // window.addEventListener('focus', fetchActiveMap);
    // return () => window.removeEventListener('focus', fetchActiveMap);
  }, [initializeSocket, fetchActiveMap]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-primary text-text-primary">
        Загрузка карты...
      </div>
    );
  }

  if (!activeMap) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-primary text-text-primary">
        <div className="text-center">
          <p className="text-xl mb-2">Карта ещё не открыта</p>
          <p className="text-sm text-text-secondary">Мастер скоро покажет карту игрокам</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-bg-primary overflow-hidden">
      <MapViewer map={activeMap} />
    </div>
  );
};
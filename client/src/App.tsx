// client/src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MasterDashboardPage from './pages/MasterDashboardPage';
import ItemsPage from './pages/ItemsPage';
import AbilitiesPage from './pages/AbilitiesPage';
import EffectsPage from './pages/EffectsPage';
import { NpcsPage } from "./pages/NpcsPage";
import MasterLayout from './components/layout/MasterLayout';
import { RacesPage } from './pages/RacesPage';
import { PlayerSelectionPage } from './pages/PlayerSelectionPage';
import PlayerLayout from './components/layout/PlayerLayout';
import { PlayerCharacterSheetPage } from './pages/PlayerCharacterSheetPage';
import { PlayerInventoryPage } from './pages/PlayerInventoryPage';
import { PlayerAbilitiesPage } from './pages/PlayerAbilitiesPage';
import { PlayerEffectsPage } from './pages/PlayerEffectsPage';
import { PlayerMapPage } from './pages/PlayerMapPage';
import { CombatPage } from './pages/CombatPage';
import { NotificationProvider } from './contexts/NotificationProvider';
import { getSocket } from './lib/socket';
import { usePlayerStore } from './stores/playerStore';
import { useNpcStore } from './stores/npcStore';
import { useCombatStore } from './stores/combatStore';
import { useLogStore } from './stores/logStore';
import { useAbilityStore } from './stores/abilityStore';
import { useEffectStore } from './stores/effectStore';
import { useItemStore } from './stores/itemStore';
import { useRaceStore } from './stores/raceStore';
import { MapsPage } from "./pages/MapsPage";
import { useMapStore } from './stores/mapStore';
import { PublicMapPage } from './pages/PublicMapPage';
import { PlayerNotesPage } from './pages/PlayerNotesPage';
import { MyRoomsPage } from './pages/MyRoomsPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useRoomStore } from './stores/roomStore';

const App: React.FC = () => {
  // Инициализируем сокет один раз при старте приложения
  useEffect(() => {
    // Создаём соединение
    const socket = getSocket();
    // Инициализируем подписки во всех сторах
    usePlayerStore.getState().initializeSocket();
    useNpcStore.getState().initializeSocket();
    useCombatStore.getState().initializeSocket();
    useLogStore.getState().initializeSocket();
    useAbilityStore.getState().initializeSocket();
    useEffectStore.getState().initializeSocket();
    useItemStore.getState().initializeSocket();
    useRaceStore.getState().initializeSocket();
    useMapStore.getState().initializeSocket();

    // Опционально: закрываем соединение при размонтировании (но приложение обычно не размонтируется)
    return () => {
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, []);

  // Подписка на изменения текущей комнаты
  useEffect(() => {
    const { currentRoom } = useRoomStore.getState();
    const roomId = currentRoom?.id ?? null;

    // Передаём roomId во все сторы
    usePlayerStore.getState().setRoomId(roomId);
    useNpcStore.getState().setRoomId(roomId);
    useAbilityStore.getState().setRoomId(roomId);
    useEffectStore.getState().setRoomId(roomId);
    useItemStore.getState().setRoomId(roomId);
    useRaceStore.getState().setRoomId(roomId);
    useMapStore.getState().setRoomId(roomId);
    useCombatStore.getState().setRoomId(roomId);
    useLogStore.getState().setRoomId(roomId);

    // Подписываемся на изменения в roomStore
    const unsubscribe = useRoomStore.subscribe((state, prevState) => {
      const newRoomId = state.currentRoom?.id ?? null;
      const oldRoomId = prevState.currentRoom?.id ?? null;
      if (newRoomId !== oldRoomId) {
        // Комната изменилась – обновляем во всех сторах
        usePlayerStore.getState().setRoomId(newRoomId);
        useNpcStore.getState().setRoomId(newRoomId);
        useAbilityStore.getState().setRoomId(newRoomId);
        useEffectStore.getState().setRoomId(newRoomId);
        useItemStore.getState().setRoomId(newRoomId);
        useRaceStore.getState().setRoomId(newRoomId);
        useMapStore.getState().setRoomId(newRoomId);
        useCombatStore.getState().setRoomId(newRoomId);
        useLogStore.getState().setRoomId(newRoomId);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <NotificationProvider>
      <Router>
        <Routes>
          {/* Публичные маршруты */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/map" element={<PublicMapPage />} />

          {/* Защищённые маршруты для мастера */}
          <Route element={<ProtectedRoute requireRoom={false} />}>
            <Route path="/rooms" element={<MyRoomsPage />} />
          </Route>

          <Route element={<ProtectedRoute requireRoom={true} />}>
            <Route path="/master" element={<MasterLayout />}>
              <Route index element={<MasterDashboardPage />} />
              <Route path="items" element={<ItemsPage />} />
              <Route path="abilities" element={<AbilitiesPage />} />
              <Route path="effects" element={<EffectsPage />} />
              <Route path="npcs" element={<NpcsPage />} />
              <Route path="races" element={<RacesPage />} />
              <Route path="combat" element={<CombatPage />} />
              <Route path="maps" element={<MapsPage />} />
            </Route>
          </Route>

          {/* Игровые маршруты (пока без защиты, но позже можно добавить) */}
          <Route path="/player/select" element={<PlayerSelectionPage />} />
          <Route path="/player/:playerId" element={<PlayerLayout />}>
            <Route index element={<PlayerCharacterSheetPage />} />
            <Route path="inventory" element={<PlayerInventoryPage />} />
            <Route path="abilities" element={<PlayerAbilitiesPage />} />
            <Route path="effects" element={<PlayerEffectsPage />} />
            <Route path="map" element={<PlayerMapPage />} />
            <Route path="notes" element={<PlayerNotesPage />} />
          </Route>
        </Routes>
      </Router>
    </NotificationProvider>
  );
};

export default App;
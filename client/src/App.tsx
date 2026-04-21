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

  return (
    <NotificationProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/map" element={<PublicMapPage />} /> 
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
          <Route path="/player/select" element={<PlayerSelectionPage />} />
          <Route path="/player/:playerId" element={<PlayerLayout />}>
            <Route index element={<PlayerCharacterSheetPage />} />
            <Route path="inventory" element={<PlayerInventoryPage />} />
            <Route path="abilities" element={<PlayerAbilitiesPage />} />
            <Route path="effects" element={<PlayerEffectsPage />} />
            <Route path="map" element={<PlayerMapPage />} />
          </Route>
        </Routes>
      </Router>
    </NotificationProvider>
  );
};

export default App;
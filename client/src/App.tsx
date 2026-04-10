// Разделяем маршруты: публичные (без Layout) и защищённые (с Layout)
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MasterDashboardPage from './pages/MasterDashboardPage';
import ItemsPage from './pages/ItemsPage';
import AbilitiesPage from './pages/AbilitiesPage';
import EffectsPage from './pages/EffectsPage';
import { NpcsPage } from "./pages/NpcsPage";
import MasterLayout from './components/layout/MasterLayout'; // ← Обёртка с сайдбаром
import { RacesPage } from './pages/RacesPage';
import { PlayerSelectionPage } from './pages/PlayerSelectionPage';
import PlayerLayout from './components/layout/PlayerLayout';
import { PlayerCharacterSheetPage } from './pages/PlayerCharacterSheetPage';
import { PlayerInventoryPage } from './pages/PlayerInventoryPage';
import { PlayerAbilitiesPage } from './pages/PlayerAbilitiesPage';
import { PlayerEffectsPage } from './pages/PlayerEffectsPage';
import { PlayerMapPage } from './pages/PlayerMapPage';
import { CombatPage } from './pages/CombatPage';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Публичная страница — без Layout */}
        <Route path="/" element={<LoginPage />} />

        {/* Все страницы мастера внутри одного Layout */}
        <Route path="/master" element={<MasterLayout />}>
          <Route index element={<MasterDashboardPage />} />  // /master
          <Route path="items" element={<ItemsPage />} />     // /master/items
          <Route path="abilities" element={<AbilitiesPage />} />
          <Route path="effects" element={<EffectsPage />} />
          <Route path="npcs" element={<NpcsPage />} />
          <Route path="races" element={<RacesPage />} />
          <Route path="combat" element={<CombatPage />} />
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
  );
};

export default App;
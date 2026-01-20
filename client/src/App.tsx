// Разделяем маршруты: публичные (без Layout) и защищённые (с Layout)
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MasterDashboardPage from './pages/MasterDashboardPage';
import ItemsPage from './pages/ItemsPage';
import AbilitiesPage from './pages/AbilitiesPage';
import EffectsPage from './pages/EffectsPage';
import EnemiesPage from './pages/EnemiesPage';
import MasterLayout from './components/layout/MasterLayout'; // ← Обёртка с сайдбаром

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
          <Route path="enemies" element={<EnemiesPage />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
// Разделяем маршруты: публичные (без Layout) и защищённые (с Layout)
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MasterDashboardPage from './pages/MasterDashboardPage';
import Layout from './components/layout/Layout'; // ← Обёртка с сайдбаром

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Публичная страница — без Layout */}
        <Route path="/" element={<LoginPage />} />

        {/* Защищённые страницы — с Layout */}
        <Route
          path="/master"
          element={
            <Layout>
              <MasterDashboardPage />
            </Layout>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
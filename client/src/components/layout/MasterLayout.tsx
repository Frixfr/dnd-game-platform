// components/layout/MasterLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom'; // ← добавляем Outlet
import Sidebar from './Sidebar';
import Header from './Header';

const MasterLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Outlet отображает текущую вложенную страницу */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MasterLayout;
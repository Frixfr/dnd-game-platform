// Обёртка для авторизованных страниц — содержит Sidebar, Header и основной контент
import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-slate-50">
      {/* Сайдбар — фиксированная ширина, всегда слева */}
      <Sidebar />

      {/* Основное содержимое — занимает оставшееся пространство */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
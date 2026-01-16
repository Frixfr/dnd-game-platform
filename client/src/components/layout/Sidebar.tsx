// Простой сайдбар — если он у вас уже есть, можно использовать его как есть
import React from 'react';

const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-6">
        <h2 className="text-xl font-bold text-slate-800">DnD Platform</h2>
      </div>
      <nav className="mt-6 flex-1 px-4">
        <ul className="space-y-2">
          <li><a href="/master" className="block px-4 py-2 text-slate-700 hover:bg-slate-100 rounded">Мастерская</a></li>
          {/* Другие пункты... */}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
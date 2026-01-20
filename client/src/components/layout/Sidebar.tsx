// Sidebar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-6">
        <h2 className="text-xl font-bold text-slate-800">DnD Platform</h2>
      </div>
      <nav className="mt-6 flex-1 px-4">
        <ul className="space-y-2">
          {/* Обратите внимание на использование NavLink */}
          <li>
            <NavLink 
              to="/master"
              end // ← важно для точного совпадения
              className={({ isActive }) => 
                `block px-4 py-2 rounded transition-colors ${isActive 
                  ? 'bg-blue-100 text-blue-700 font-medium' 
                  : 'text-slate-700 hover:bg-slate-100'}`
              }
            >
              👥 Игроки
            </NavLink>
          </li>          
          
          <li>
            <NavLink 
              to="/master/abilities"
              className={({ isActive }) => 
                `block px-4 py-2 rounded transition-colors ${isActive 
                  ? 'bg-blue-100 text-blue-700 font-medium' 
                  : 'text-slate-700 hover:bg-slate-100'}`
              }
            >
              ⚡ Способности
            </NavLink>
          </li>
          
          <li>
            <NavLink 
              to="/master/items"
              className={({ isActive }) => 
                `block px-4 py-2 rounded transition-colors ${isActive 
                  ? 'bg-blue-100 text-blue-700 font-medium' 
                  : 'text-slate-700 hover:bg-slate-100'}`
              }
            >
              🎒 Предметы
            </NavLink>
          </li>
          
          <li>
            <NavLink 
              to="/master/effects"
              className={({ isActive }) => 
                `block px-4 py-2 rounded transition-colors ${isActive 
                  ? 'bg-blue-100 text-blue-700 font-medium' 
                  : 'text-slate-700 hover:bg-slate-100'}`
              }
            >
              ✨ Эффекты
            </NavLink>
          </li>
          
          <li>
            <NavLink 
              to="/master/enemies"
              className={({ isActive }) => 
                `block px-4 py-2 rounded transition-colors ${isActive 
                  ? 'bg-blue-100 text-blue-700 font-medium' 
                  : 'text-slate-700 hover:bg-slate-100'}`
              }
            >
              🐉 Враги
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
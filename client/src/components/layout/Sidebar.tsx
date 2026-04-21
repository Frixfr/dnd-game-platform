import React from 'react';
import { NavLink } from 'react-router-dom';

interface SidebarProps {
  onClose: () => void;
  isMobile: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ onClose, isMobile }) => {
  const handleLinkClick = () => {
    if (isMobile) onClose();
  };

  return (
    <aside className="w-64 h-full bg-white border-r border-slate-200 flex flex-col shadow-lg md:shadow-none">
      <div className="p-6">
        <h2 className="text-xl font-bold text-slate-800">DnD Platform</h2>
      </div>
      <nav className="mt-6 flex-1 px-4">
        <ul className="space-y-2">
          <li>
            <NavLink
              to="/master"
              end
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `block px-4 py-2 rounded transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              👥 Игроки
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/master/abilities"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `block px-4 py-2 rounded transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              ⚡ Способности
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/master/items"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `block px-4 py-2 rounded transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              🎒 Предметы
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/master/effects"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `block px-4 py-2 rounded transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              ✨ Эффекты
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/master/npcs"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `block px-4 py-2 rounded transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              🧟 NPC
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/master/races"
              onClick={handleLinkClick}
              className={({ isActive }) => `block px-4 py-2 rounded transition-colors ${isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              🌍 Расы
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/master/combat"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `block px-4 py-2 rounded transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              ⚔️ Бой
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/master/maps"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `block px-4 py-2 rounded transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              🗺️ Карты
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
// client/src/components/layout/PlayerSidebar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';

interface PlayerSidebarProps {
  onClose: () => void;
  isMobile: boolean;
  playerId: number;
}

const PlayerSidebar: React.FC<PlayerSidebarProps> = ({ onClose, isMobile, playerId }) => {
  const handleLinkClick = () => {
    if (isMobile) onClose();
  };

  return (
    <aside className="w-64 h-full bg-white border-r border-slate-200 flex flex-col shadow-lg md:shadow-none">
      <div className="p-6">
        <h2 className="text-xl font-bold text-slate-800">Игровой режим</h2>
      </div>
      <nav className="mt-6 flex-1 px-4">
        <ul className="space-y-2">
          <li>
            <NavLink
              to={`/player/${playerId}`}
              end
              onClick={handleLinkClick}
              className={({ isActive }) => `block px-4 py-2 rounded transition-colors ${isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              📋 Лист персонажа
            </NavLink>
          </li>
          <li>
            <NavLink
              to={`/player/${playerId}/inventory`}
              onClick={handleLinkClick}
              className={({ isActive }) => `block px-4 py-2 rounded transition-colors ${isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              🎒 Инвентарь
            </NavLink>
          </li>
          <li>
            <NavLink
              to={`/player/${playerId}/abilities`}
              onClick={handleLinkClick}
              className={({ isActive }) => `block px-4 py-2 rounded transition-colors ${isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              ⚡ Способности
            </NavLink>
          </li>
          <li>
            <NavLink
              to={`/player/${playerId}/effects`}
              onClick={handleLinkClick}
              className={({ isActive }) => `block px-4 py-2 rounded transition-colors ${isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              ✨ Эффекты
            </NavLink>
          </li>
          <li>
            <NavLink
              to={`/player/${playerId}/map`}
              onClick={handleLinkClick}
              className={({ isActive }) => `block px-4 py-2 rounded transition-colors ${isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              🗺️ Карта
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default PlayerSidebar;
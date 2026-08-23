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
    <aside className="w-64 h-full bg-bg-secondary border-r border-border-color flex flex-col shadow-lg md:shadow-none">
      <div className="p-6 border-b border-border-color">
        <h2 className="text-xl font-bold text-text-primary">
          DnD Platform
        </h2>
      </div>
      <nav className="mt-4 flex-1 px-3">
        <ul className="space-y-1.5">
          <li>
            <NavLink
              to="/master"
              end
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-accent-red/20 text-accent-red border border-accent-red/30 shadow-md'
                    : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary'
                }`
              }
            >
              <span className="text-lg">👥</span>
              <span className="font-medium">Игроки</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/master/abilities"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-accent-red/20 text-accent-red border border-accent-red/30 shadow-md'
                    : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary'
                }`
              }
            >
              <span className="text-lg">⚡</span>
              <span className="font-medium">Способности</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/master/items"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-accent-red/20 text-accent-red border border-accent-red/30 shadow-md'
                    : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary'
                }`
              }
            >
              <span className="text-lg">🎒</span>
              <span className="font-medium">Предметы</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/master/effects"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-accent-red/20 text-accent-red border border-accent-red/30 shadow-md'
                    : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary'
                }`
              }
            >
              <span className="text-lg">✨</span>
              <span className="font-medium">Эффекты</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/master/npcs"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-accent-red/20 text-accent-red border border-accent-red/30 shadow-md'
                    : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary'
                }`
              }
            >
              <span className="text-lg">🧟</span>
              <span className="font-medium">NPC</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/master/races"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-accent-red/20 text-accent-red border border-accent-red/30 shadow-md'
                    : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary'
                }`
              }
            >
              <span className="text-lg">🌍</span>
              <span className="font-medium">Расы</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/master/combat"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-accent-red/20 text-accent-red border border-accent-red/30 shadow-md'
                    : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary'
                }`
              }
            >
              <span className="text-lg">⚔️</span>
              <span className="font-medium">Бой</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/master/maps"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-accent-red/20 text-accent-red border border-accent-red/30 shadow-md'
                    : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary'
                }`
              }
            >
              <span className="text-lg">🗺️</span>
              <span className="font-medium">Карты</span>
            </NavLink>
          </li>
        </ul>
      </nav>
      <div className="p-4 border-t border-border-color text-center text-xs text-text-muted">
        Master Dashboard v1.0
      </div>
    </aside>
  );
};

export default Sidebar;

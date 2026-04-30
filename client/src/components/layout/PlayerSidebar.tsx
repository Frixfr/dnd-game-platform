// client/src/components/layout/PlayerSidebar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ScrollText,
  Backpack,
  Zap,
  Sparkles,
  Map,
  FileText,
  X,
} from 'lucide-react';

interface PlayerSidebarProps {
  onClose: () => void;
  isMobile: boolean;
  playerId: number;
}

const PlayerSidebar: React.FC<PlayerSidebarProps> = ({ onClose, isMobile, playerId }) => {
  const handleLinkClick = () => {
    if (isMobile) onClose();
  };

  const navItems = [
    { to: `/player/${playerId}`, icon: ScrollText, label: 'Лист персонажа', end: true },
    { to: `/player/${playerId}/inventory`, icon: Backpack, label: 'Инвентарь' },
    { to: `/player/${playerId}/abilities`, icon: Zap, label: 'Способности' },
    { to: `/player/${playerId}/effects`, icon: Sparkles, label: 'Эффекты' },
    { to: `/player/${playerId}/map`, icon: Map, label: 'Карта' },
    { to: `/player/${playerId}/notes`, icon: FileText, label: 'Заметки' },
  ];

  return (
    <aside className="w-72 h-full bg-gray-900/90 backdrop-blur-md border-r border-amber-500/20 flex flex-col shadow-2xl">
      <div className="p-6 flex items-center justify-between border-b border-amber-500/20">
        <h2 className="text-xl font-bold bg-gradient-to-r from-amber-300 to-yellow-500 bg-clip-text text-transparent">
          Игровой режим
        </h2>
        {isMobile && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-amber-400"
          >
            <X size={24} />
          </button>
        )}
      </div>
      <nav className="mt-8 flex-1 px-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30 shadow-md'
                      : 'text-gray-300 hover:bg-gray-800/60 hover:text-amber-300'
                  }`
                }
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-amber-500/20 text-center text-xs text-gray-500">
        D&D Campaign Manager
      </div>
    </aside>
  );
};

export default PlayerSidebar;
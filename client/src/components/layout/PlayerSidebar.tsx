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
} from 'lucide-react';

interface PlayerSidebarProps {
  playerId: number;
  /** Дополнительные классы для управления видимостью (например, hidden md:flex) */
  className?: string;
}

const PlayerSidebar: React.FC<PlayerSidebarProps> = ({ playerId, className = '' }) => {
  const navItems = [
    { to: `/player/${playerId}`, icon: ScrollText, label: 'Лист персонажа', end: true },
    { to: `/player/${playerId}/inventory`, icon: Backpack, label: 'Инвентарь' },
    { to: `/player/${playerId}/abilities`, icon: Zap, label: 'Способности' },
    { to: `/player/${playerId}/effects`, icon: Sparkles, label: 'Эффекты' },
    { to: `/player/${playerId}/map`, icon: Map, label: 'Карта' },
    { to: `/player/${playerId}/notes`, icon: FileText, label: 'Заметки' },
  ];

  return (
    <aside className={`w-72 h-full bg-[#0A1F44]/90 backdrop-blur-md border-r border-[#FF0026]/20 flex-col shadow-2xl ${className}`}>
      <div className="p-6 flex items-center justify-between border-b border-[#FF0026]/20">
        <h2 className="text-xl font-bold bg-gradient-to-r from-[#F2E9E4] to-[#d4c9c3] bg-clip-text text-transparent">
          Игровой режим
        </h2>
      </div>
      <nav className="mt-8 flex-1 px-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-[#FF0026]/20 text-[#FF0026] border border-[#FF0026]/30 shadow-md'
                      : 'text-[#F2E9E4] hover:bg-[#0d2552] hover:text-[#FF0026]'
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
      <div className="p-4 border-t border-[#FF0026]/20 text-center text-xs text-[#8b9bb4]">
        D&D Campaign Manager
      </div>
    </aside>
  );
};

export default PlayerSidebar;
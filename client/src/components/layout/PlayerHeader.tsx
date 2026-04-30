// client/src/components/layout/PlayerHeader.tsx
import React from 'react';
import { LogOut, Menu, User } from 'lucide-react';

interface PlayerHeaderProps {
  toggleSidebar: () => void;
  isMobile: boolean;
  onLogout: () => void;
  playerName: string;
}

const PlayerHeader: React.FC<PlayerHeaderProps> = ({ toggleSidebar, isMobile, onLogout, playerName }) => {
  return (
    <header className="bg-gray-900/80 backdrop-blur-sm border-b border-amber-500/20 shadow-md">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center gap-3">
          {isMobile && (
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-amber-400"
              aria-label="Меню"
            >
              <Menu size={24} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <User size={20} className="text-amber-400" />
            <h1 className="text-xl font-semibold bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent">
              {playerName}
            </h1>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-300 hover:text-amber-300"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Выйти</span>
        </button>
      </div>
    </header>
  );
};

export default PlayerHeader;
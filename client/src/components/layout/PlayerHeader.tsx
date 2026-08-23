// client/src/components/layout/PlayerHeader.tsx
import React from 'react';
import { LogOut, User } from 'lucide-react';

interface PlayerHeaderProps {
  onLogout: () => void;
  playerName: string;
}

const PlayerHeader: React.FC<PlayerHeaderProps> = ({ onLogout, playerName }) => {
  return (
    <header className="bg-[#0A1F44]/90 backdrop-blur-sm border-b border-[#FF0026]/20 shadow-md">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        <div className="flex items-center gap-2 min-w-0">
          <User size={20} className="text-[#FF0026] flex-shrink-0" />
          <h1 className="text-lg md:text-xl font-semibold bg-gradient-to-r from-[#F2E9E4] to-[#d4c9c3] bg-clip-text text-transparent truncate">
            {playerName}
          </h1>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0d2552] hover:bg-[#112d63] transition-colors text-[#F2E9E4] hover:text-[#FF0026] flex-shrink-0"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Выйти</span>
        </button>
      </div>
    </header>
  );
};

export default PlayerHeader;

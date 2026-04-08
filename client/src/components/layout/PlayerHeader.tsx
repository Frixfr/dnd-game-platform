// client/src/components/layout/PlayerHeader.tsx
import React from 'react';

interface PlayerHeaderProps {
  toggleSidebar: () => void;
  isMobile: boolean;
  onLogout: () => void;
  playerName: string;
}

const PlayerHeader: React.FC<PlayerHeaderProps> = ({ toggleSidebar, isMobile, onLogout, playerName }) => {
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center gap-3">
          {isMobile && (
            <button onClick={toggleSidebar} className="p-2 rounded-md hover:bg-slate-100">
              <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <h1 className="text-xl font-semibold text-slate-800">
            Добро пожаловать, {playerName}
          </h1>
        </div>
        <button onClick={onLogout} className="text-sm text-slate-600 hover:text-slate-800">
          Выйти
        </button>
      </div>
    </header>
  );
};

export default PlayerHeader;
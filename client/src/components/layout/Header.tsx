// client/src/components/layout/Header.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, Shield, DoorOpen } from 'lucide-react';

interface HeaderProps {
  toggleSidebar: () => void;
  isMobile: boolean;
  onLogout?: () => void;
  roomName?: string;
  onLeaveRoom?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  toggleSidebar,
  isMobile,
  onLogout,
  roomName,
  onLeaveRoom,
}) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      navigate('/');
    }
  };

  const handleLeaveRoom = () => {
    if (onLeaveRoom) {
      onLeaveRoom();
    }
  };

  return (
    <header className="bg-bg-secondary/90 backdrop-blur-md border-b border-border-color shadow-md">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        <div className="flex items-center gap-3 min-w-0">
          {isMobile && (
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-bg-card-hover focus:outline-none text-accent-red flex-shrink-0"
              aria-label="Меню"
            >
              <Menu size={24} />
            </button>
          )}
          <div className="flex items-center gap-2 min-w-0">
            <Shield size={20} className="text-accent-red flex-shrink-0" />
            <h1 className="text-lg md:text-xl font-semibold text-text-primary truncate">
              Панель мастера
            </h1>
            {roomName && (
              <>
                <span className="text-text-muted mx-1">/</span>
                <span className="text-sm md:text-base text-accent-red font-medium truncate">
                  {roomName}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {roomName && onLeaveRoom && (
            <button
              onClick={handleLeaveRoom}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-tertiary hover:bg-bg-card-hover transition-all text-text-secondary hover:text-accent-red border border-border-color hover:border-accent-red/30"
              title="Покинуть комнату"
            >
              <DoorOpen size={18} />
              <span className="hidden sm:inline">Покинуть</span>
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-tertiary hover:bg-bg-card-hover transition-all text-text-secondary hover:text-accent-red border border-border-color hover:border-accent-red/30"
            title="Выйти полностью"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Выйти</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
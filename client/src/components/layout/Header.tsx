import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, Shield } from 'lucide-react';

interface HeaderProps {
  toggleSidebar: () => void;
  isMobile: boolean;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, isMobile, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      navigate('/');
    }
  };

  return (
    <header className="bg-bg-secondary/90 backdrop-blur-md border-b border-border-color shadow-md">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center gap-3">
          {isMobile && (
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-bg-card-hover focus:outline-none text-accent-red"
              aria-label="Меню"
            >
              <Menu size={24} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-accent-red" />
            <h1 className="text-xl font-semibold text-text-primary">
              Панель мастера
            </h1>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-tertiary hover:bg-bg-card-hover transition-all text-text-secondary hover:text-accent-red border border-border-color hover:border-accent-red/30"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Выйти</span>
        </button>
      </div>
    </header>
  );
};

export default Header;

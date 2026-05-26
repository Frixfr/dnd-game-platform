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
    <header className="bg-[var(--color-bg-secondary)]/90 backdrop-blur-md border-b border-[var(--border-color)] shadow-md">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center gap-3">
          {isMobile && (
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-[var(--color-bg-card-hover)] focus:outline-none text-amber-400"
              aria-label="Меню"
            >
              <Menu size={24} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-amber-400" />
            <h1 className="text-xl font-semibold bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
              Панель мастера
            </h1>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-card-hover)] transition-all text-[var(--text-secondary)] hover:text-amber-300 border border-[var(--border-color)] hover:border-amber-500/30"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Выйти</span>
        </button>
      </div>
    </header>
  );
};

export default Header;

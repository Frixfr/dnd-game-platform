import React from 'react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  toggleSidebar: () => void;
  isMobile: boolean;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, isMobile }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // В будущем: очистка стора, отключение сокетов
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center gap-3">
          {isMobile && (
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md hover:bg-slate-100 focus:outline-none"
              aria-label="Меню"
            >
              <svg
                className="w-6 h-6 text-slate-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          )}
          <h1 className="text-xl font-semibold text-slate-800">
            Панель мастера
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={handleLogout}
            className="text-sm text-slate-600 hover:text-slate-800 transition-colors"
          >
            Выйти
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
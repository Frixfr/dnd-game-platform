// client/src/components/layout/MobileTabBar.tsx
import { ScrollText, Backpack, Zap, Sparkles, Map, FileText } from 'lucide-react';
import { NavLink } from 'react-router-dom';

interface MobileTabBarProps {
  playerId: number;
}

const MobileTabBar: React.FC<MobileTabBarProps> = ({ playerId }) => {
  const navItems = [
    { to: `/player/${playerId}`, icon: ScrollText, label: 'Лист', end: true },
    { to: `/player/${playerId}/inventory`, icon: Backpack, label: 'Сумка' },
    { to: `/player/${playerId}/abilities`, icon: Zap, label: 'Навыки' },
    { to: `/player/${playerId}/effects`, icon: Sparkles, label: 'Эффекты' },
    { to: `/player/${playerId}/map`, icon: Map, label: 'Карта' },
    { to: `/player/${playerId}/notes`, icon: FileText, label: 'Заметки' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A1F44]/95 backdrop-blur-md border-t border-[#FF0026]/20 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-stretch h-16 max-w-md mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 min-w-0 h-full transition-colors gap-0.5 ${
                isActive
                  ? 'text-[#FF0026]'
                  : 'text-[#8b9bb4] hover:text-[#F2E9E4]'
              }`
            }
          >
            <item.icon size={20} className="flex-shrink-0" />
            <span className="text-[10px] leading-none truncate w-full text-center px-0.5">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileTabBar;

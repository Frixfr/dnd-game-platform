// client/src/components/layout/MobileTabBar.tsx
import { ScrollText, Backpack, Zap, Map } from 'lucide-react';
import { NavLink } from 'react-router-dom';

interface MobileTabBarProps {
  playerId: number;
}

const MobileTabBar: React.FC<MobileTabBarProps> = ({ playerId }) => {
  const navItems = [
    { to: `/player/${playerId}`, icon: ScrollText, label: 'Лист' },
    { to: `/player/${playerId}/inventory`, icon: Backpack, label: 'Инвентарь' },
    { to: `/player/${playerId}/abilities`, icon: Zap, label: 'Способности' },
    { to: `/player/${playerId}/map`, icon: Map, label: 'Карта' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-md border-t border-amber-500/20 z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? 'text-amber-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`
            }
          >
            <item.icon size={22} />
            <span className="text-[11px] mt-0.5">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default MobileTabBar;
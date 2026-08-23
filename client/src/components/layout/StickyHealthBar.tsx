// client/src/components/layout/StickyHealthBar.tsx
import React from 'react';
import { Heart, Shield } from 'lucide-react';

interface StickyHealthBarProps {
  health: number;
  baseMaxHealth: number;   // базовое максимальное здоровье (из таблицы)
  finalMaxHealth: number;  // финальное с учётом всех эффектов
  armor: number;
}

const StickyHealthBar: React.FC<StickyHealthBarProps> = ({
  health,
  baseMaxHealth,
  finalMaxHealth,
  armor
}) => {
  const bonus = finalMaxHealth - baseMaxHealth;
  const percent = (health / finalMaxHealth) * 100;

  return (
    <div className="sticky top-0 z-40 bg-[#0A1F44]/90 backdrop-blur-md border-b border-[#FF0026]/20 px-4 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 flex-1">
        <Heart size={18} className="text-[#FF0026]" fill="currentColor" />
        <div className="flex-1 h-2 bg-[#112d63] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#FF0026] to-[#cc001f] rounded-full" style={{ width: `${percent}%` }} />
        </div>
        <span className="text-sm text-[#F2E9E4]">
          {health}/{baseMaxHealth}
          {bonus !== 0 && <span className="text-xs text-[#FF0026] ml-1">(+{bonus})</span>}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Shield size={16} className="text-[#FF0026]" />
        <span className="text-sm font-semibold text-[#F2E9E4]">{armor}</span>
      </div>
    </div>
  );
};

export default StickyHealthBar;
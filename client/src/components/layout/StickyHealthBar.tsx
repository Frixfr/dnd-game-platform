// client/src/components/layout/StickyHealthBar.tsx
import React from 'react';
import { Heart, Shield } from 'lucide-react';

interface StickyHealthBarProps {
  health: number;
  maxHealth: number;
  armor: number;
}

const StickyHealthBar: React.FC<StickyHealthBarProps> = ({ health, maxHealth, armor }) => {
  const percent = (health / maxHealth) * 100;
  return (
    <div className="sticky top-0 z-40 bg-gray-900/90 backdrop-blur-md border-b border-amber-500/20 px-4 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 flex-1">
        <Heart size={18} className="text-red-400" fill="currentColor" />
        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full" style={{ width: `${percent}%` }} />
        </div>
        <span className="text-sm text-white">{health}/{maxHealth}</span>
      </div>
      <div className="flex items-center gap-1">
        <Shield size={16} className="text-amber-400" />
        <span className="text-sm font-semibold text-white">{armor}</span>
      </div>
    </div>
  );
};

export default StickyHealthBar;
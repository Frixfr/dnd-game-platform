// client/src/components/ui/CollapsibleSection.tsx
import React, { type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  headerRight?: ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultExpanded = true,
  onToggle,
  headerRight,
}) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  const toggle = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    onToggle?.(newExpanded);
  };

  return (
    <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-amber-500/20 overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between p-5 hover:bg-gray-800/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={20} className="text-amber-400" /> : <ChevronRight size={20} className="text-amber-400" />}
          <h3 className="text-lg font-semibold text-amber-400">{title}</h3>
        </div>
        {headerRight && <div className="text-gray-400">{headerRight}</div>}
      </button>
      {expanded && <div className="p-5 pt-0">{children}</div>}
    </div>
  );
};
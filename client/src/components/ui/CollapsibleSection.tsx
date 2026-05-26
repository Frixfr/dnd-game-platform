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
    <div className="bg-card backdrop-blur-sm rounded-2xl border border-border-color overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between p-5 hover:bg-bg-secondary transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={20} className="text-accent-red" /> : <ChevronRight size={20} className="text-accent-red" />}
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        </div>
        {headerRight && <div className="text-text-secondary">{headerRight}</div>}
      </button>
      {expanded && <div className="p-5 pt-0">{children}</div>}
    </div>
  );
};
"use client";

import type { LucideIcon } from "lucide-react";

export type PanelTabDef = {
  id: string;
  label: string;
  icon?: LucideIcon;
};

type PanelTabsProps = {
  tabs: PanelTabDef[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
};

export function PanelTabs({ tabs, active, onChange, className = "" }: PanelTabsProps) {
  if (tabs.length <= 1) return null;

  return (
    <div
      className={`flex gap-1 border-b border-gray-100 overflow-x-auto -mx-1 px-1 ${className}`}
      role="tablist"
      aria-label="Seções do painel"
    >
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={[
              "inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap",
              "px-3 sm:px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4FD8] focus-visible:ring-offset-1",
              isActive
                ? "font-bold text-[#0C1A3D] border-[#4ADE80]"
                : "font-medium text-gray-500 border-transparent hover:text-gray-800 hover:border-gray-200",
            ].join(" ")}
          >
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

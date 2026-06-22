"use client";

import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import type { PanelPriority } from "@/lib/use-panel-state";
import { usePanelToolbar } from "@/lib/use-panel-state";

type PanelToolbarProps = {
  sections: { id: string; priority: PanelPriority }[];
  className?: string;
};

export function PanelToolbar({ sections, className = "" }: PanelToolbarProps) {
  const { expandAll, collapseSecondary } = usePanelToolbar(sections);

  if (sections.length === 0) return null;

  return (
    <div className={`flex items-center justify-end gap-2 ${className}`}>
      <button
        type="button"
        onClick={collapseSecondary}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4FD8]"
      >
        <ChevronsDownUp className="w-3.5 h-3.5" />
        Recolher secundários
      </button>
      <button
        type="button"
        onClick={expandAll}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4FD8]"
      >
        <ChevronsUpDown className="w-3.5 h-3.5" />
        Expandir tudo
      </button>
    </div>
  );
}

"use client";

import { ChevronsDownUp, ChevronsUpDown, Minimize2 } from "lucide-react";
import type { PanelPriority } from "@/lib/use-panel-state";
import { usePanelToolbar } from "@/lib/use-panel-state";

type PanelToolbarProps = {
  sections: { id: string; priority: PanelPriority }[];
  className?: string;
};

export function PanelToolbar({ sections, className = "" }: PanelToolbarProps) {
  const { expandAll, collapseSecondary, collapseAll } = usePanelToolbar(sections);

  if (sections.length === 0) return null;

  return (
    <div
      className={`sticky top-[52px] z-20 -mx-1 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-gray-100 bg-[#EEF3FF]/95 px-2 py-2 backdrop-blur-sm sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none ${className}`}
    >
      <button
        type="button"
        onClick={collapseAll}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4FD8]"
      >
        <Minimize2 className="w-3.5 h-3.5" />
        Recolher tudo
      </button>
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

/** IDs compartilhados entre páginas e toolbars */
export const JORNADA_PANEL_ID = "jornada-proximo-passo";

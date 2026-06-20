"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ArrowRight } from "lucide-react";
import type { PanelPriority } from "@/lib/use-panel-state";
import { usePanelSection } from "@/lib/use-panel-state";

export type PanelUrgency = "none" | "warning" | "critical";

type PanelSectionProps = {
  id: string;
  title: string;
  icon?: ReactNode;
  priority?: PanelPriority;
  defaultOpen?: boolean;
  badge?: string | number;
  summary?: string;
  urgency?: PanelUrgency;
  href?: string;
  flush?: boolean;
  className?: string;
  children: ReactNode;
};

const URGENCY_BORDER: Record<PanelUrgency, string> = {
  none: "border-gray-100",
  warning: "border-l-4 border-l-amber-400 border-gray-100",
  critical: "border-l-4 border-l-red-500 border-gray-100",
};

export function PanelSection({
  id,
  title,
  icon,
  priority = "primary",
  defaultOpen,
  badge,
  summary,
  urgency = "none",
  href,
  flush = false,
  className = "",
  children,
}: PanelSectionProps) {
  const { open, toggle } = usePanelSection(id, priority, defaultOpen);

  return (
    <section
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${URGENCY_BORDER[urgency]} ${className}`}
      data-panel-id={id}
    >
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={`panel-content-${id}`}
          className="flex flex-1 items-center gap-2.5 min-w-0 px-4 py-3.5 sm:px-5 text-left hover:bg-gray-50/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1B4FD8]"
        >
          {icon && (
            <span className="shrink-0 text-gray-400 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
          )}
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-gray-800 truncate">{title}</span>
            {!open && summary && (
              <span className="block text-xs text-gray-400 truncate mt-0.5">{summary}</span>
            )}
          </span>
          {badge !== undefined && badge !== "" && (
            <span className="shrink-0 text-xs font-semibold tabular-nums bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {href && (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Link
            href={href as any}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 flex items-center gap-1 px-3 sm:px-4 text-xs text-[#1B4FD8] font-semibold border-l border-gray-100 hover:bg-blue-50/50 transition-colors"
          >
            Ver tudo
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      <div
        id={`panel-content-${id}`}
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        hidden={false}
      >
        <div className="overflow-hidden">
          <div
            className={
              flush
                ? "border-t border-gray-50"
                : "px-4 pb-4 sm:px-5 sm:pb-5 pt-3 border-t border-gray-50"
            }
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

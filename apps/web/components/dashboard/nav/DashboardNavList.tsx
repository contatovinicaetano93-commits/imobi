"use client";

import Link from "next/link";
import type { Route } from "next";
import { ChevronRight } from "lucide-react";
import type { DashboardNavItem } from "./dashboard-nav-config";
import { NAV_SECTION_LABELS } from "./dashboard-nav-config";

type DashboardNavListProps = {
  items: DashboardNavItem[];
  activePath: string;
  accent: string;
  loading?: boolean;
  onNavigate?: () => void;
};

function NavSkeleton() {
  return (
    <div className="flex flex-col gap-1.5 px-3">
      {[80, 65, 70, 60, 75, 55].map((w, i) => (
        <div
          key={i}
          className="h-8 animate-pulse rounded-lg bg-white/10"
          style={{ width: `${w}%` }}
        />
      ))}
    </div>
  );
}

export function DashboardNavList({
  items,
  activePath,
  accent,
  loading,
  onNavigate,
}: DashboardNavListProps) {
  if (loading) return <NavSkeleton />;

  let lastSection = "";

  return (
    <>
      {items.map((item, idx) => {
        const active = activePath === "/dashboard"
          ? activePath === item.href
          : activePath.startsWith(item.href);
        const showSection = item.section && item.section !== lastSection;
        if (item.section) lastSection = item.section;
        const Icon = item.icon;

        return (
          <div key={`${idx}-${item.href}`}>
            {showSection && (
              <p className="px-3 pb-1 pt-5 font-['Jost'] text-[0.72rem] font-bold uppercase tracking-[0.14em] text-white/30">
                {NAV_SECTION_LABELS[item.section!]}
              </p>
            )}
            <Link
              href={item.href as Route}
              onClick={onNavigate}
              className="flex min-h-[44px] items-center gap-2.5 rounded-lg px-3 py-2 font-['Jost'] text-[0.82rem] transition-all duration-150"
              style={{
                fontWeight: active ? 600 : 400,
                color: active ? "#ffffff" : "rgba(255,255,255,0.5)",
                background: active ? "rgba(74,222,128,0.1)" : "transparent",
                borderLeft: active ? `2px solid ${accent}` : "2px solid transparent",
              }}
            >
              <Icon size={13} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {active && <ChevronRight size={10} className="opacity-50" />}
            </Link>
          </div>
        );
      })}
    </>
  );
}

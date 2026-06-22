"use client";

import Link from "next/link";
import type { Route } from "next";
import type { DashboardNavItem } from "./dashboard-nav-config";
import { DASHBOARD_MINT, getNavRole, ROLE_META } from "./dashboard-nav-config";

function dashboardNavIsActive(path: string, href: string): boolean {
  return href === "/dashboard" ? path === href : path.startsWith(href);
}

type DashboardMobileBottomNavProps = {
  path: string;
  role: import("./dashboard-nav-config").DashboardUserRole;
  items: DashboardNavItem[];
};

export function DashboardMobileBottomNav({ path, role, items }: DashboardMobileBottomNavProps) {
  const tabs = items.filter((i) => i.mobileTab).slice(0, 5);
  if (tabs.length < 2) return null;

  const navRole = getNavRole(role, path);
  const accent = (navRole ? ROLE_META[navRole] : null)?.accent ?? DASHBOARD_MINT;

  return (
    <nav
      className="dash-bottomnav fixed inset-x-0 bottom-0 z-[90] border-t border-[var(--dash-border)] bg-[var(--dash-surface)] px-1 pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegação principal"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {tabs.map((item) => {
          const active = dashboardNavIsActive(path, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href as Route}
              className="flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 no-underline transition-colors"
              style={{ color: active ? accent : "var(--dash-muted)" }}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
              <span className="max-w-full truncate font-['Jost'] text-[0.58rem] font-semibold">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

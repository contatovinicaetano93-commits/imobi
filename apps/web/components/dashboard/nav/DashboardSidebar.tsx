"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { DashboardNavItem, DashboardUserRole } from "./dashboard-nav-config";
import { DASHBOARD_MINT, ROLE_META, getNavRole } from "./dashboard-nav-config";
import { DashboardLogo } from "./DashboardLogo";
import { DashboardNavList } from "./DashboardNavList";
import { DashboardThemeToggle } from "./DashboardThemeToggle";
import { DashboardUserFooter } from "./DashboardUserFooter";
import type { DashboardTheme } from "@/hooks/use-dashboard-theme";

type DashboardSidebarProps = {
  path: string;
  role: DashboardUserRole;
  roleLoading: boolean;
  userName: string | null;
  userEmail: string | null;
  visibleNav: DashboardNavItem[];
  theme: DashboardTheme;
  onToggleTheme: () => void;
  onNavigate?: () => void;
};

export function DashboardSidebar({
  path,
  role,
  roleLoading,
  userName,
  userEmail,
  visibleNav,
  theme,
  onToggleTheme,
  onNavigate,
}: DashboardSidebarProps) {
  const navRole = getNavRole(role, path);
  const navMeta = navRole ? ROLE_META[navRole] : role ? ROLE_META[role] : null;
  const accent = navMeta?.accent ?? DASHBOARD_MINT;
  const isPreviewingOtherPanel = role === "ADMIN" && navRole !== "ADMIN";

  return (
    <>
      <div className="px-4 pb-2.5 pt-5">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5 no-underline">
          <DashboardLogo size={22} />
          <span className="font-['Barlow_Condensed'] text-[1.1rem] font-extrabold tracking-wide text-white">
            IMOBI
          </span>
        </Link>
      </div>

      {isPreviewingOtherPanel && (
        <div className="mx-3 mb-1 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-2">
          <p className="m-0 mb-1 font-['Jost'] text-[0.58rem] font-bold uppercase tracking-[0.1em] text-white/35">
            Visualizando como
          </p>
          <p className="m-0 mb-1.5 font-['Jost'] text-[0.72rem] font-semibold text-white">
            {ROLE_META[navRole ?? ""]?.label ?? navRole}
          </p>
          <Link
            href="/dashboard/admin"
            onClick={onNavigate}
            className="flex items-center gap-1 font-['Jost'] text-[0.65rem] font-semibold no-underline"
            style={{ color: DASHBOARD_MINT }}
          >
            <ArrowLeft size={10} /> Voltar ao Admin
          </Link>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-1.5">
        <DashboardNavList
          items={visibleNav}
          activePath={path}
          accent={accent}
          loading={roleLoading}
          onNavigate={onNavigate}
        />
      </nav>

      <DashboardThemeToggle theme={theme} onToggle={onToggleTheme} />
      <DashboardUserFooter
        role={role}
        userName={userName}
        userEmail={userEmail}
        accent={accent}
        compact={!!onNavigate}
      />
    </>
  );
}

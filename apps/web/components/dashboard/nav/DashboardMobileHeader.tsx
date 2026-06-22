"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { DashboardTheme } from "@/hooks/use-dashboard-theme";
import { DashboardLogo } from "./DashboardLogo";
import { DashboardThemeToggle } from "./DashboardThemeToggle";

type DashboardMobileHeaderProps = {
  parentPath: Route | null;
  mobileOpen: boolean;
  onToggleMenu: () => void;
  theme: DashboardTheme;
  onToggleTheme: () => void;
};

export function DashboardMobileHeader({
  parentPath,
  mobileOpen,
  onToggleMenu,
  theme,
  onToggleTheme,
}: DashboardMobileHeaderProps) {
  const router = useRouter();

  return (
    <div className="dash-mhidden fixed inset-x-0 top-0 z-[100] flex h-[52px] items-center justify-between gap-2 border-b border-white/[0.06] bg-[#0C1A3D] px-4">
      {parentPath ? (
        <button
          type="button"
          onClick={() => router.push(parentPath)}
          aria-label="Voltar"
          className="flex min-h-[44px] shrink-0 items-center gap-1.5 bg-transparent px-2.5 font-['Jost'] text-[0.82rem] font-semibold text-white"
        >
          <ArrowLeft size={18} />
        </button>
      ) : (
        <Link href="/" className="flex shrink-0 items-center gap-2 no-underline">
          <DashboardLogo size={20} />
          <span className="font-['Barlow_Condensed'] text-base font-extrabold tracking-wide text-white">
            IMOBI
          </span>
        </Link>
      )}

      {parentPath && (
        <Link href="/" className="flex flex-1 items-center justify-center gap-1.5 no-underline">
          <DashboardLogo size={18} />
          <span className="font-['Barlow_Condensed'] text-[0.95rem] font-extrabold tracking-wide text-white">
            IMOBI
          </span>
        </Link>
      )}

      <div className="flex shrink-0 items-center">
        <DashboardThemeToggle theme={theme} onToggle={onToggleTheme} variant="header" />
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label="Menu"
          className="flex h-11 w-11 flex-col items-center justify-center gap-[4.5px] bg-transparent"
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-[1.5px] w-5 rounded-sm bg-white/75 transition-all duration-200"
              style={{
                transform:
                  i === 0 && mobileOpen
                    ? "rotate(45deg) translate(4.5px,4.5px)"
                    : i === 2 && mobileOpen
                      ? "rotate(-45deg) translate(4.5px,-4.5px)"
                      : "none",
                opacity: i === 1 && mobileOpen ? 0 : 1,
              }}
            />
          ))}
        </button>
      </div>
    </div>
  );
}

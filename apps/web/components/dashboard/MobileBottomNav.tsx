"use client";

import Link from "next/link";
import type { MobileTabItem } from "@/lib/mobile-nav";
import { isMobileTabActive } from "@/lib/mobile-nav";
import { cx } from "@/components/imobi-ui/ui";

type Props = {
  tabs: MobileTabItem[];
  pathname: string;
  activeHref: string;
  accent: string;
  onOpenMenu: () => void;
};

/**
 * Bottom tab nav — padrão UX mobile (inspirado SOMA), cores Imobi.
 * Visível apenas em viewport &lt; 768px (controlado pelo pai via CSS).
 */
export function MobileBottomNav({
  tabs,
  pathname,
  activeHref,
  accent,
  onOpenMenu,
}: Props) {
  if (tabs.length === 0) return null;

  return (
    <nav
      className="dash-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-imobi-navy shadow-imobi-nav"
      aria-label="Navegação principal"
    >
      <div
        className="mx-auto grid max-w-lg"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.isMenu
            ? false
            : isMobileTabActive(pathname, tab.href, activeHref);

          if (tab.isMenu) {
            return (
              <button
                key={tab.href}
                type="button"
                onClick={onOpenMenu}
                className="relative flex flex-col items-center gap-1 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
                aria-label="Abrir menu"
              >
                <Icon size={20} className="text-white/45" strokeWidth={2} />
                <span className="font-sans text-[0.66rem] font-semibold text-white/45">
                  {tab.shortLabel}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href as "/"}
              className="relative flex flex-col items-center gap-1 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <span
                  className="absolute -top-px h-1 w-8 rounded-full"
                  style={{ backgroundColor: accent }}
                />
              )}
              <Icon
                size={20}
                style={{ color: active ? accent : "rgba(255,255,255,0.45)" }}
                strokeWidth={active ? 2.4 : 2}
              />
              <span
                className={cx(
                  "font-sans text-[0.66rem] font-semibold",
                  active ? "" : "text-white/45",
                )}
                style={active ? { color: accent } : undefined}
              >
                {tab.shortLabel}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

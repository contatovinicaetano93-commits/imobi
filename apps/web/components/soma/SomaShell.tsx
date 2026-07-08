"use client";

import { useState, type ReactNode } from "react";
import {
  Menu,
  Search,
  Play,
  X,
  ChevronRight,
  User,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cx } from "./ui";

export type SomaNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export type SomaMenuItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-gold-grad font-display text-sm font-black text-black">
        S
      </span>
      <span className="font-display text-lg font-bold tracking-[0.35em] text-soma-text">
        SOMA
      </span>
    </div>
  );
}

export function SomaShell({
  user,
  nav,
  menu,
  activeId,
  onSelect,
  children,
}: {
  user: { name: string; role: string };
  nav: SomaNavItem[];
  menu?: SomaMenuItem[];
  activeId: string;
  onSelect: (id: string) => void;
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col bg-soma-bg text-soma-text">
      {/* Topbar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 bg-soma-bg/95 px-4 py-3 backdrop-blur">
        <button
          aria-label="Abrir menu"
          onClick={() => setDrawerOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-full text-soma-muted active:bg-white/5"
        >
          <Menu size={22} />
        </button>

        <Logo />

        <div className="flex items-center gap-1.5">
          <button
            aria-label="Buscar"
            className="grid h-10 w-10 place-items-center rounded-full text-soma-muted active:bg-white/5"
          >
            <Search size={20} />
          </button>
          <div className="flex items-center gap-2 rounded-full bg-gold-grad py-1 pl-1 pr-3">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-black/85 text-soma-gold">
              <Play size={13} fill="currentColor" />
            </span>
            <div className="leading-tight">
              <p className="max-w-[84px] truncate text-right font-sans text-[0.7rem] font-medium text-black/70">
                {user.name}
              </p>
              <p className="text-right font-sans text-[0.72rem] font-bold text-black">
                {user.role}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 space-y-4 px-4 pb-28 pt-1">{children}</main>

      {/* Bottom tab nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t border-soma-line/60 bg-soma-surface/95 backdrop-blur">
        <div className="grid grid-cols-5 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          {nav.map((item) => {
            const active = item.id === activeId;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className="relative flex flex-col items-center gap-1 py-1"
              >
                {active && (
                  <span className="absolute -top-2 h-1 w-8 rounded-full bg-gold-grad" />
                )}
                <Icon
                  size={20}
                  className={active ? "text-soma-gold" : "text-soma-muted"}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span
                  className={cx(
                    "font-sans text-[0.66rem] font-semibold",
                    active ? "text-soma-gold" : "text-soma-faint",
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[80%] max-w-[320px] flex-col bg-soma-surface p-4">
            <div className="mb-6 flex items-center justify-between">
              <Logo />
              <button
                aria-label="Fechar menu"
                onClick={() => setDrawerOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full text-soma-muted active:bg-white/5"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto">
              {(menu ?? nav).map((item) => {
                const active = item.id === activeId;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelect(item.id);
                      setDrawerOpen(false);
                    }}
                    className={cx(
                      "flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition",
                      active
                        ? "border border-soma-gold/60 bg-soma-gold/10 text-soma-gold"
                        : "text-soma-muted active:bg-white/5",
                    )}
                  >
                    <Icon size={18} />
                    <span className="flex-1 font-sans text-[0.92rem] font-semibold">
                      {item.label}
                    </span>
                    <ChevronRight size={16} className="opacity-50" />
                  </button>
                );
              })}
            </div>

            <div className="mt-3 space-y-1 border-t border-soma-line/60 pt-3">
              <button className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-soma-muted active:bg-white/5">
                <User size={18} />
                <span className="flex-1 font-sans text-[0.92rem] font-semibold">
                  Meus dados
                </span>
                <ChevronRight size={16} className="opacity-50" />
              </button>
              <button className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-soma-gold active:bg-white/5">
                <LogOut size={18} />
                <span className="flex-1 font-sans text-[0.92rem] font-semibold">
                  Sair da conta
                </span>
                <ChevronRight size={16} className="opacity-50" />
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

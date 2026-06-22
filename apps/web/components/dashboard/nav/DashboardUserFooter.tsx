"use client";

import { LogOut } from "lucide-react";
import type { DashboardUserRole } from "./dashboard-nav-config";
import { ROLE_META } from "./dashboard-nav-config";

type DashboardUserFooterProps = {
  role: DashboardUserRole;
  userName: string | null;
  userEmail: string | null;
  accent: string;
  compact?: boolean;
};

export function DashboardUserFooter({
  role,
  userName,
  userEmail,
  accent,
  compact,
}: DashboardUserFooterProps) {
  const meta = role ? ROLE_META[role] ?? ROLE_META[role === "GESTOR_FUNDO" ? "GESTOR" : ""] : null;
  const displayAccent = meta?.accent ?? accent;

  const initials = userName
    ? userName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
    : "?";

  return (
    <div>
      {meta && (
        <div
          className="mx-3 mb-2 flex items-center gap-1.5 rounded-md px-2.5 py-1"
          style={{
            background: `${displayAccent}18`,
            border: `1px solid ${displayAccent}30`,
          }}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: displayAccent }} />
          <span
            className="font-['Jost'] text-[0.72rem] font-bold uppercase tracking-[0.08em]"
            style={{ color: displayAccent }}
          >
            {meta.label}
          </span>
        </div>
      )}
      <div
        className="flex items-center gap-2 border-t border-white/10 px-3.5"
        style={{ paddingTop: compact ? "0.7rem" : "0.8rem", paddingBottom: compact ? "0.7rem" : "0.8rem" }}
      >
        <div
          className="flex shrink-0 items-center justify-center rounded-full font-['Jost'] text-[0.65rem] font-bold"
          style={{
            width: compact ? 26 : 28,
            height: compact ? 26 : 28,
            background: `${displayAccent}22`,
            border: `1.5px solid ${displayAccent}55`,
            color: displayAccent,
          }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-['Jost'] text-[0.74rem] font-semibold text-white">
            {userName ?? "Usuário"}
          </p>
          <p className="truncate font-['Jost'] text-[0.62rem] text-white/35">
            {userEmail ?? role ?? ""}
          </p>
        </div>
        <button
          type="button"
          title="Sair"
          onClick={async () => {
            try {
              await fetch("/api/auth/logout", { method: "POST" });
            } catch {
              /* limpa sessão local mesmo se API falhar */
            }
            window.location.href = "/login";
          }}
          className="-m-3 flex min-h-[44px] min-w-[44px] items-center justify-center text-white/30 transition-colors hover:text-white/70"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
}

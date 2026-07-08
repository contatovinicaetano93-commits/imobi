import type { ReactNode } from "react";
import { DashboardShell } from "./DashboardShell";
import { enforceJornadaGate } from "@/lib/jornada-server-gate";

/**
 * Layout do grupo (dashboard) — Server Component.
 * Roda o gating de jornada server-side (no-op quando a flag está desligada) e
 * renderiza o shell client persistente. Fecha o buraco de deep-link em hard
 * loads sem remover o `JornadaGuard` client (que cobre soft navigations).
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await enforceJornadaGate();
  return <DashboardShell>{children}</DashboardShell>;
}

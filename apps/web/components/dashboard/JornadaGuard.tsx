"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { BETA_MVP_MODE } from "@/lib/beta-mvp";
import { isJornadaHubPath } from "@/lib/jornada-routes";
import { useJornadaOptional } from "@/hooks/jornada-context";

const GUIDED_ROLES = new Set(["TOMADOR", "CONSTRUTOR", "GESTOR", "GESTOR_FUNDO"]);

type Props = {
  role: string | null;
  children: React.ReactNode;
};

/**
 * MVP meio-termo: não força redirect — sidebar livre.
 * Só revalida jornada ao voltar ao hub (construtor/gestor).
 */
export function JornadaGuard({ role, children }: Props) {
  const pathname = usePathname();
  const jornadaCtx = useJornadaOptional();

  const guided =
    BETA_MVP_MODE && role != null && GUIDED_ROLES.has(role);

  useEffect(() => {
    if (!guided || !jornadaCtx?.jornada) return;
    if (!isJornadaHubPath(pathname, jornadaCtx.jornada)) return;
    void jornadaCtx.refresh();
  }, [guided, pathname, jornadaCtx?.jornada, jornadaCtx?.refresh]);

  return <>{children}</>;
}

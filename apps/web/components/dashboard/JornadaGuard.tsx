"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { BETA_MVP_MODE } from "@/lib/beta-mvp";
import { useJornadaOptional } from "@/hooks/jornada-context";

const GUIDED_ROLES = new Set(["TOMADOR", "CONSTRUTOR", "GESTOR", "GESTOR_FUNDO"]);
const HUB_PATHS = new Set(["/dashboard/construtor", "/dashboard/gestor"]);

type Props = {
  role: string | null;
  children: React.ReactNode;
};

/**
 * MVP: não força redirect. Revalida jornada só ao voltar ao hub vindo de outra rota.
 */
export function JornadaGuard({ role, children }: Props) {
  const pathname = usePathname();
  const jornadaCtx = useJornadaOptional();
  const prevPathRef = useRef(pathname);

  const guided =
    BETA_MVP_MODE && role != null && GUIDED_ROLES.has(role);

  useEffect(() => {
    if (!guided || !jornadaCtx) return;

    const prev = prevPathRef.current;
    prevPathRef.current = pathname;

    const enteredHub = HUB_PATHS.has(pathname) && !HUB_PATHS.has(prev);
    if (enteredHub) {
      void jornadaCtx.refresh();
    }
  }, [guided, pathname, jornadaCtx]);

  return <>{children}</>;
}

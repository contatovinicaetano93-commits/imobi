"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { BETA_MVP_MODE } from "@/lib/beta-mvp";
import { isJornadaPathAllowed } from "@/lib/jornada-routes";
import { useJornadaOptional } from "@/hooks/jornada-context";

const GUIDED_ROLES = new Set(["TOMADOR", "CONSTRUTOR", "GESTOR", "GESTOR_FUNDO"]);
const HUB_PATHS = new Set(["/dashboard/construtor", "/dashboard/gestor"]);

type Props = {
  role: string | null;
  children: React.ReactNode;
};

/**
 * MVP guiado: revalida jornada ao voltar ao hub.
 * Tomador/gestor navegam livremente pela sidebar (rotas MVP); middleware bloqueia o resto.
 */
export function JornadaGuard({ role, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const jornadaCtx = useJornadaOptional();
  const prevPathRef = useRef(pathname);

  const guided = BETA_MVP_MODE && role != null && GUIDED_ROLES.has(role);

  useEffect(() => {
    if (!guided || !jornadaCtx) return;

    const prev = prevPathRef.current;
    prevPathRef.current = pathname;

    const enteredHub = HUB_PATHS.has(pathname) && !HUB_PATHS.has(prev);
    if (enteredHub) {
      void jornadaCtx.refresh();
    }
  }, [guided, pathname, jornadaCtx]);

  useEffect(() => {
    if (!guided || !jornadaCtx?.jornada || jornadaCtx.loading) return;

    if (!isJornadaPathAllowed(pathname, jornadaCtx.jornada)) {
      router.replace(jornadaCtx.jornada.href as Route);
    }
  }, [guided, pathname, jornadaCtx, router]);

  return <>{children}</>;
}

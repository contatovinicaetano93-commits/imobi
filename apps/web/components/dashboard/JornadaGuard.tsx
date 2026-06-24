"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BETA_MVP_MODE } from "@/lib/beta-mvp";
import { isJornadaPathAllowed } from "@/lib/jornada-routes";
import { useJornadaOptional } from "@/hooks/jornada-context";

const GUIDED_ROLES = new Set(["TOMADOR", "CONSTRUTOR", "GESTOR", "GESTOR_FUNDO"]);

type Props = {
  role: string | null;
  children: React.ReactNode;
};

/**
 * MVP: redireciona para jornada.href se o usuário abrir rota fora do passo atual.
 * Erro de jornada é exibido pelas páginas (GuidedFlowShell), não aqui.
 */
export function JornadaGuard({ role, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const jornadaCtx = useJornadaOptional();

  const guided =
    BETA_MVP_MODE && role != null && GUIDED_ROLES.has(role);

  useEffect(() => {
    if (!guided || !jornadaCtx?.jornada) return;

    const j = jornadaCtx.jornada;
    if (!isJornadaPathAllowed(pathname, j)) {
      router.replace(j.href as "/");
    }
  }, [guided, jornadaCtx?.jornada, pathname, router]);

  return <>{children}</>;
}

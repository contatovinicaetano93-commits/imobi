"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { jornadaApi, type Jornada } from "@/lib/api";
import { BETA_MVP_MODE } from "@/lib/beta-mvp";
import { isJornadaPathAllowed } from "@/lib/jornada-routes";
import { JornadaError } from "./JornadaError";

const GUIDED_ROLES = new Set(["TOMADOR", "CONSTRUTOR", "GESTOR", "GESTOR_FUNDO"]);

type Props = {
  role: string | null;
  children: React.ReactNode;
};

/**
 * MVP: redireciona para jornada.href se o usuário abrir rota fora do passo atual.
 */
export function JornadaGuard({ role, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState(false);

  const guided =
    BETA_MVP_MODE && role != null && GUIDED_ROLES.has(role);

  useEffect(() => {
    if (!guided) return;

    let cancelled = false;

    jornadaApi
      .obter()
      .then((j: Jornada) => {
        if (cancelled) return;
        setError(false);
        if (!isJornadaPathAllowed(pathname, j)) {
          router.replace(j.href as "/");
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [guided, pathname, router]);

  if (!guided) return <>{children}</>;
  if (error) return <JornadaError />;

  return <>{children}</>;
}

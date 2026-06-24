"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Jornada } from "@/lib/api";
import { obterJornadaResiliente, mensagemErroJornada } from "@/lib/jornada-fetch";
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
  const [error, setError] = useState<string | null>(null);

  const guided =
    BETA_MVP_MODE && role != null && GUIDED_ROLES.has(role);

  useEffect(() => {
    if (!guided) return;

    let cancelled = false;

    obterJornadaResiliente()
      .then((j: Jornada) => {
        if (cancelled) return;
        setError(null);
        if (!isJornadaPathAllowed(pathname, j)) {
          router.replace(j.href as "/");
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(mensagemErroJornada(err));
      });

    return () => {
      cancelled = true;
    };
  }, [guided, pathname, router]);

  if (!guided) return <>{children}</>;
  if (error) return <JornadaError message={error} />;

  return <>{children}</>;
}

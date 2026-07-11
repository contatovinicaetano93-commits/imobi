"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { useJornadaOptional } from "@/hooks/jornada-context";

type Props = {
  role: string | null;
  children: React.ReactNode;
};

/** Fluxo guiado: fora do href atual da jornada (e não concluída) → volta pro passo certo. */
export function JornadaGuard({ role, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const jornadaCtx = useJornadaOptional();
  const prevPathRef = useRef(pathname);

  const guided = role != null;

  useEffect(() => {
    if (!guided || !jornadaCtx) return;
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;
    if (pathname !== prev) void jornadaCtx.refresh();
  }, [guided, pathname, jornadaCtx]);

  useEffect(() => {
    if (!guided || !jornadaCtx?.jornada || jornadaCtx.loading) return;
    const { jornada } = jornadaCtx;
    if (jornada.concluido) return;
    const onHref = pathname === jornada.href || pathname.startsWith(`${jornada.href}/`);
    if (!onHref) router.replace(jornada.href as Route);
  }, [guided, pathname, jornadaCtx, router]);

  return <>{children}</>;
}

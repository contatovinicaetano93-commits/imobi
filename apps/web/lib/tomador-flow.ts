import type { Route } from "next";

/** Hub único do tomador/construtor — substitui painel + rotas soltas. */
export const TOMADOR_HOME = "/dashboard/inicio" as Route;

export const TOMADOR_ROUTES = {
  home: TOMADOR_HOME,
  documentos: "/dashboard/inicio/documentos" as Route,
  credito: "/dashboard/inicio/credito" as Route,
  obras: "/dashboard/obras" as Route,
  obraNova: "/dashboard/obras/nova" as Route,
  obra: (id: string) => `/dashboard/obras/${id}` as Route,
  perfil: "/dashboard/perfil" as Route,
  creditoSolicitar: (valor?: number, prazo?: number) => {
    const q = new URLSearchParams({ solicitar: "1" });
    if (valor != null && valor > 0) q.set("valor", String(Math.round(valor)));
    if (prazo != null && prazo > 0) q.set("prazo", String(prazo));
    return `/dashboard/inicio/credito?${q}` as Route;
  },
  creditoExtrato: "/dashboard/inicio/credito?visao=extrato" as Route,
} as const;

/** Rotas legadas → destino unificado (middleware + redirects locais). */
export const TOMADOR_LEGACY_REDIRECTS: Record<string, Route | string> = {
  "/dashboard/construtor": TOMADOR_HOME,
  "/dashboard/kyc": TOMADOR_ROUTES.documentos,
  "/dashboard/simulador": TOMADOR_ROUTES.credito,
  "/dashboard/score": TOMADOR_HOME,
};

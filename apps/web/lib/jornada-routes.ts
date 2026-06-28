import type { Jornada } from "@/lib/api";
import { GUIDED_STRICT_MODE, isMvpRouteAllowed } from "@/lib/beta-mvp";

const ACCOUNT_PREFIXES = ["/dashboard/perfil", "/dashboard/notificacoes"];

function isObrasPath(pathname: string): boolean {
  return pathname === "/dashboard/obras" || pathname.startsWith("/dashboard/obras/");
}

function isGestorPath(pathname: string): boolean {
  return pathname === "/dashboard/gestor" || pathname.startsWith("/dashboard/gestor/");
}

/** Rotas sempre permitidas (conta). */
function isAccountPath(pathname: string): boolean {
  return ACCOUNT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isTomadorPathStrict(pathname: string, jornada: Jornada): boolean {
  const href = jornada.href;
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;

  const bloqueiaObras = jornada.passoAtual === "kyc" || jornada.passoAtual === "viabilidade";
  if (isObrasPath(pathname) && !bloqueiaObras) return true;

  switch (jornada.passoAtual) {
    case "kyc":
      return pathname.startsWith("/dashboard/kyc");
    case "viabilidade":
      return (
        pathname.startsWith("/dashboard/viabilidade") ||
        pathname.startsWith("/dashboard/proposta-credito")
      );
    case "obra":
      return isObrasPath(pathname);
    case "credito":
      return pathname.startsWith("/dashboard/credito");
    case "aguardando":
      return pathname === "/dashboard/construtor" || pathname.startsWith("/dashboard/credito");
    case "acompanhar":
      return (
        pathname === "/dashboard/construtor" ||
        pathname.startsWith("/dashboard/credito") ||
        isObrasPath(pathname)
      );
    case "concluido":
      return (
        pathname === "/dashboard/construtor" ||
        pathname.startsWith("/dashboard/credito") ||
        isObrasPath(pathname)
      );
    default:
      return false;
  }
}

/**
 * Rotas permitidas no fluxo guiado.
 * Gestor: livre dentro de /dashboard/gestor/* (KPIs, sem jornada linear).
 * Tomador: passo-a-passo quando GUIDED_STRICT_MODE=true.
 */
export function isJornadaPathAllowed(pathname: string, jornada: Jornada): boolean {
  if (isAccountPath(pathname)) return true;

  if (jornada.perfil === "gestor") {
    return isGestorPath(pathname);
  }

  if (GUIDED_STRICT_MODE) {
    return isTomadorPathStrict(pathname, jornada);
  }

  if (isMvpRouteAllowed(pathname, "TOMADOR")) return true;

  const href = jornada.href;
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;

  const bloqueiaObras = jornada.passoAtual === "kyc" || jornada.passoAtual === "viabilidade";
  if (isObrasPath(pathname) && !bloqueiaObras) {
    return true;
  }

  switch (jornada.passoAtual) {
    case "kyc":
      return pathname.startsWith("/dashboard/kyc");
    case "viabilidade":
      return (
        pathname.startsWith("/dashboard/viabilidade") ||
        pathname.startsWith("/dashboard/proposta-credito")
      );
    case "obra":
      return isObrasPath(pathname);
    case "aguardando":
      return pathname === "/dashboard/construtor";
    case "acompanhar":
    case "concluido":
      return (
        pathname === "/dashboard/construtor" ||
        pathname.startsWith("/dashboard/credito")
      );
    case "credito":
      return pathname.startsWith("/dashboard/credito");
    default:
      return false;
  }
}

/** Hub do perfil — hero com próximo passo (tomador) ou painel KPI (gestor). */
export function isJornadaHubPath(pathname: string, jornada: Jornada): boolean {
  if (jornada.perfil === "gestor") {
    return pathname === "/dashboard/gestor";
  }
  if (jornada.perfil === "tomador") {
    return pathname === "/dashboard/construtor";
  }
  return false;
}

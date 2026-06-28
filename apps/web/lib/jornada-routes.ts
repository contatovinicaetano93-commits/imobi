import type { Jornada } from "@/lib/api";
import { GUIDED_STRICT_MODE, isMvpRouteAllowed } from "@/lib/beta-mvp";

const ACCOUNT_PREFIXES = ["/dashboard/perfil", "/dashboard/notificacoes"];

function isObrasPath(pathname: string): boolean {
  return pathname === "/dashboard/obras" || pathname.startsWith("/dashboard/obras/");
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
        pathname.startsWith("/dashboard/obras")
      );
    default:
      return false;
  }
}

function isGestorPathStrict(pathname: string, jornada: Jornada): boolean {
  const href = jornada.href;
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;

  switch (jornada.passoAtual) {
    case "gestor_kyc":
      return pathname.startsWith("/dashboard/gestor/kyc");
    case "gestor_etapas":
      return pathname.startsWith("/dashboard/gestor/etapas") || isObrasPath(pathname);
    case "gestor_ok":
      return pathname === "/dashboard/gestor" || pathname.startsWith("/dashboard/gestor/");
    default:
      return false;
  }
}

/**
 * Rotas permitidas no fluxo guiado.
 * Lançamento: GUIDED_STRICT_MODE força passo-a-passo (tomador/gestor).
 * Beta legado: sidebar livre dentro do MVP quando BETA_MVP_MODE=true.
 */
export function isJornadaPathAllowed(pathname: string, jornada: Jornada): boolean {
  if (isAccountPath(pathname)) return true;

  if (GUIDED_STRICT_MODE) {
    if (jornada.perfil === "tomador") return isTomadorPathStrict(pathname, jornada);
    if (jornada.perfil === "gestor") return isGestorPathStrict(pathname, jornada);
  } else {
    if (jornada.perfil === "tomador") {
      return isMvpRouteAllowed(pathname, "TOMADOR");
    }
    if (jornada.perfil === "gestor") {
      return isMvpRouteAllowed(pathname, "GESTOR");
    }
  }

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
    case "gestor_kyc":
      return pathname.startsWith("/dashboard/gestor/kyc");
    case "gestor_etapas":
      return (
        pathname.startsWith("/dashboard/gestor/etapas") || isObrasPath(pathname)
      );
    case "gestor_ok":
      return pathname === "/dashboard/gestor";
    default:
      return false;
  }
}

/** Hub do perfil — hero com próximo passo. */
export function isJornadaHubPath(pathname: string, jornada: Jornada): boolean {
  if (jornada.perfil === "gestor") {
    return pathname === "/dashboard/gestor";
  }
  if (jornada.perfil === "tomador") {
    return pathname === "/dashboard/construtor";
  }
  return false;
}

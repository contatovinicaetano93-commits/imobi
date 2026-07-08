import type { Jornada } from "@/lib/api";
import { GUIDED_STRICT_MODE, isMvpRouteAllowed } from "@/lib/beta-mvp";

const ACCOUNT_PREFIXES = ["/dashboard/perfil", "/dashboard/notificacoes"];

function isObrasPath(pathname: string): boolean {
  return pathname === "/dashboard/obras" || pathname.startsWith("/dashboard/obras/");
}

/** "Minha operação" agrega obras + crédito (aba única do tomador). */
function isOperacaoPath(pathname: string): boolean {
  return pathname === "/dashboard/operacao" || pathname.startsWith("/dashboard/operacao/");
}

function isGestorPath(pathname: string): boolean {
  return pathname === "/dashboard/gestor";
}

/** Rotas sempre permitidas (conta). */
function isAccountPath(pathname: string): boolean {
  return ACCOUNT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isTomadorPathStrict(pathname: string, jornada: Jornada): boolean {
  const href = jornada.href;
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;

  const bloqueiaObras = jornada.passoAtual === "kyc" || jornada.passoAtual === "viabilidade";
  if ((isObrasPath(pathname) || isOperacaoPath(pathname)) && !bloqueiaObras) return true;

  switch (jornada.passoAtual) {
    case "kyc":
      return pathname.startsWith("/dashboard/kyc");
    case "viabilidade":
      return (
        pathname.startsWith("/dashboard/viabilidade") ||
        pathname.startsWith("/dashboard/proposta-credito")
      );
    case "obra":
      return isObrasPath(pathname) || isOperacaoPath(pathname);
    case "credito":
      return pathname.startsWith("/dashboard/credito") || isOperacaoPath(pathname);
    case "aguardando":
      return (
        pathname === "/dashboard/construtor" ||
        pathname.startsWith("/dashboard/credito") ||
        isOperacaoPath(pathname)
      );
    case "acompanhar":
      return (
        pathname === "/dashboard/construtor" ||
        pathname.startsWith("/dashboard/credito") ||
        isObrasPath(pathname) ||
        isOperacaoPath(pathname)
      );
    case "concluido":
      return (
        pathname === "/dashboard/construtor" ||
        pathname.startsWith("/dashboard/credito") ||
        isObrasPath(pathname) ||
        isOperacaoPath(pathname)
      );
    default:
      return false;
  }
}

/**
 * Rotas permitidas no fluxo guiado.
 * Gestor: apenas `/dashboard/gestor` (KPIs na mesma tela).
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
  if ((isObrasPath(pathname) || isOperacaoPath(pathname)) && !bloqueiaObras) {
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
      return isObrasPath(pathname) || isOperacaoPath(pathname);
    case "aguardando":
      return pathname === "/dashboard/construtor";
    case "acompanhar":
    case "concluido":
      return (
        pathname === "/dashboard/construtor" ||
        pathname.startsWith("/dashboard/credito") ||
        isOperacaoPath(pathname)
      );
    case "credito":
      return pathname.startsWith("/dashboard/credito") || isOperacaoPath(pathname);
    default:
      return false;
  }
}

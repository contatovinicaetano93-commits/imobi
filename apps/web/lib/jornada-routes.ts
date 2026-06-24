import type { Jornada } from "@/lib/api";

const ACCOUNT_PREFIXES = ["/dashboard/perfil", "/dashboard/notificacoes"];

function isObrasPath(pathname: string): boolean {
  return pathname === "/dashboard/obras" || pathname.startsWith("/dashboard/obras/");
}

/** Rotas sempre permitidas (conta). */
function isAccountPath(pathname: string): boolean {
  return ACCOUNT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Usuário está na rota certa para o passo atual da jornada.
 * Fora disso → redirect para jornada.href (app de banco).
 */
export function isJornadaPathAllowed(pathname: string, jornada: Jornada): boolean {
  if (isAccountPath(pathname)) return true;

  const href = jornada.href;
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;

  // Após KYC/viabilidade, consultar obras (lista, detalhe, vistoria) não quebra o fluxo guiado.
  const bloqueiaObras = jornada.passoAtual === "kyc" || jornada.passoAtual === "viabilidade";
  if (isObrasPath(pathname) && !bloqueiaObras) {
    return true;
  }

  // Gestor acessa obras para vistoria mesmo no fluxo guiado.
  if (jornada.perfil === "gestor" && isObrasPath(pathname)) {
    return true;
  }

  switch (jornada.passoAtual) {
    case "kyc":
      return pathname.startsWith("/dashboard/kyc");
    case "viabilidade":
      return pathname.startsWith("/dashboard/viabilidade");
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
      return (
        pathname.startsWith("/dashboard/simulador") ||
        pathname.startsWith("/dashboard/credito")
      );
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

/** Hub do perfil — hero com próximo passo (meio-termo: sidebar livre). */
export function isJornadaHubPath(pathname: string, jornada: Jornada): boolean {
  if (jornada.perfil === "gestor") {
    return pathname === "/dashboard/gestor";
  }
  if (jornada.perfil === "tomador") {
    return pathname === "/dashboard/construtor";
  }
  return false;
}

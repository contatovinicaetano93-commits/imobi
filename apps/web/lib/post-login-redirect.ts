import { TOMADOR_HOME } from "@/lib/tomador-flow";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/dashboard/admin",
  GESTOR: "/dashboard/gestor",
  GESTOR_FUNDO: "/dashboard/gestor",
  ENGENHEIRO: "/dashboard/engenheiro",
  GESTOR_OBRA: "/dashboard/engenheiro",
  COMERCIAL: "/dashboard/comercial",
  PARCEIRO: "/dashboard/comercial",
  TOMADOR: TOMADOR_HOME,
  CONSTRUTOR: TOMADOR_HOME,
};

export function redirectAfterLogin(role: string) {
  const path = ROLE_HOME[role] ?? "/dashboard";
  if (typeof window !== "undefined") {
    window.location.assign(path);
  }
}

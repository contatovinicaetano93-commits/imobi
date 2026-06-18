export type UserTipo =
  | "CONSTRUTOR"
  | "TOMADOR"
  | "ADMIN"
  | "ENGENHEIRO"
  | "GESTOR"
  | "GESTOR_FUNDO"
  | "GESTOR_OBRA"
  | "COMERCIAL"
  | "PARCEIRO";

/** GESTOR_FUNDO é alias de GESTOR — mesmo painel no app. */
export function normalizeTipo(tipo?: string | null): UserTipo {
  const raw = (tipo ?? "TOMADOR").toUpperCase();
  const t = raw === "GESTOR_FUNDO" ? "GESTOR" : raw;
  const allowed: UserTipo[] = [
    "CONSTRUTOR", "TOMADOR", "ADMIN", "ENGENHEIRO", "GESTOR",
    "GESTOR_FUNDO", "GESTOR_OBRA", "COMERCIAL", "PARCEIRO",
  ];
  return (allowed.includes(t as UserTipo) ? t : "TOMADOR") as UserTipo;
}

export function getRoleGroup(tipo: string): string {
  switch (normalizeTipo(tipo)) {
    case "ADMIN": return "(admin)";
    case "ENGENHEIRO": return "(engenheiro)";
    case "GESTOR": return "(gestor)";
    default: return "(tabs)";
  }
}

export function getHomeRoute(tipo: string): string {
  switch (normalizeTipo(tipo)) {
    case "ADMIN": return "/(admin)/(tabs)/dashboard";
    case "ENGENHEIRO": return "/(engenheiro)/(tabs)/visitas";
    case "GESTOR": return "/(gestor)/(tabs)/dashboard";
    default: return "/(tabs)/obras";
  }
}

export function isConstrutor(tipo: string): boolean {
  const t = normalizeTipo(tipo);
  return t === "CONSTRUTOR" || t === "TOMADOR";
}

export function roleLabel(tipo: string): string {
  switch (normalizeTipo(tipo)) {
    case "ADMIN": return "Administrador";
    case "ENGENHEIRO": return "Engenheiro";
    case "GESTOR": return "Gestor de Fundo";
    case "CONSTRUTOR": return "Construtor";
    case "TOMADOR": return "Construtor";
    default: return tipo;
  }
}

export function isInCorrectApp(segments: string[], tipo: string): boolean {
  const group = getRoleGroup(tipo).replace(/[()]/g, "");
  const root = segments[0]?.replace(/[()]/g, "") ?? "";
  return root === group;
}

/**
 * Usuários para setup HTTP e seed — senhas via env (nunca commitar produção real).
 */
export type SetupUser = {
  nome: string;
  email: string;
  senha: string;
  role: "ADMIN" | "CLIENTE" | "FUNDO" | "ENGENHEIRO";
};

function pwd(envKey: string, fallback: string): string {
  return process.env[envKey]?.trim() || fallback;
}

/** Contas padrão de staging/dev — 1 por papel. */
export function getSetupUsers(): SetupUser[] {
  const users: SetupUser[] = [
    {
      nome: "Administrador IMOBI",
      email: "admin@imobi.com.br",
      senha: pwd("SEED_ADMIN_PASSWORD", "Admin@123"),
      role: "ADMIN",
    },
    {
      nome: "Fundo IMOBI",
      email: "fundo@imobi.com.br",
      senha: pwd("SEED_FUNDO_PASSWORD", "Fundo@123"),
      role: "FUNDO",
    },
    {
      nome: "Engenheiro IMOBI",
      email: "eng@imobi.com.br",
      senha: pwd("SEED_ENGENHEIRO_PASSWORD", "Eng@123"),
      role: "ENGENHEIRO",
    },
    {
      nome: "Cliente Teste",
      email: "cliente@imobi.com.br",
      senha: pwd("SEED_CLIENTE_PASSWORD", "Cliente@123"),
      role: "CLIENTE",
    },
  ];

  const ownerEmail = process.env.SEED_OWNER_EMAIL?.trim();
  const ownerPassword = process.env.SEED_OWNER_PASSWORD?.trim();
  if (ownerEmail && ownerPassword) {
    users.unshift({
      nome: process.env.SEED_OWNER_NAME?.trim() || "Owner",
      email: ownerEmail,
      senha: ownerPassword,
      role: "ADMIN",
    });
  }

  return users;
}

export function rotaParaRoleSetup(role: string): string {
  const mapa: Record<string, string> = {
    ADMIN: "/dashboard/admin",
    FUNDO: "/dashboard/fundo",
    ENGENHEIRO: "/dashboard/engenheiro",
    CLIENTE: "/dashboard/cliente",
  };
  return mapa[role] ?? "/dashboard";
}

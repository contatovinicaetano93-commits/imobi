/**
 * Usuários para setup HTTP e seed — senhas via env (nunca commitar produção real).
 */
export type SetupUser = {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  senha: string;
  tipo: "ADMIN" | "GESTOR" | "ENGENHEIRO" | "COMERCIAL" | "CONSTRUTOR" | "TOMADOR";
};

function pwd(envKey: string, fallback: string): string {
  return process.env[envKey]?.trim() || fallback;
}

/** Contas padrão de staging/dev — alinhadas com dev-seed.ts */
export function getSetupUsers(): SetupUser[] {
  const users: SetupUser[] = [
    {
      nome: "Administrador IMOBI",
      email: "admin@imobi.com.br",
      cpf: "00000000001",
      telefone: "11900000001",
      senha: pwd("SEED_ADMIN_PASSWORD", "Admin@123"),
      tipo: "ADMIN",
    },
    {
      nome: "Gestor do Fundo",
      email: "gestor@imobi.com.br",
      cpf: "00000000002",
      telefone: "11900000002",
      senha: pwd("SEED_GESTOR_PASSWORD", "Gestor@123"),
      tipo: "GESTOR",
    },
    {
      nome: "Engenheiro IMOBI",
      email: "eng@imobi.com.br",
      cpf: "00000000003",
      telefone: "11900000003",
      senha: pwd("SEED_ENGENHEIRO_PASSWORD", "Eng@123"),
      tipo: "ENGENHEIRO",
    },
    {
      nome: "Parceiro Comercial",
      email: "comercial@imobi.com.br",
      cpf: "00000000004",
      telefone: "11900000004",
      senha: pwd("SEED_COMERCIAL_PASSWORD", "Comercial@123"),
      tipo: "COMERCIAL",
    },
    {
      nome: "Construtor IMOBI",
      email: "construtor@imobi.com.br",
      cpf: "00000000005",
      telefone: "11900000005",
      senha: pwd("SEED_CONSTRUTOR_PASSWORD", "Construtor@123"),
      tipo: "CONSTRUTOR",
    },
    {
      nome: "Tomador Teste",
      email: "tomador@imobi.com.br",
      cpf: "00000000006",
      telefone: "11900000006",
      senha: pwd("SEED_TOMADOR_PASSWORD", "Tomador@123"),
      tipo: "TOMADOR",
    },
  ];

  const ownerEmail = process.env.SEED_OWNER_EMAIL?.trim();
  const ownerPassword = process.env.SEED_OWNER_PASSWORD?.trim();
  if (ownerEmail && ownerPassword) {
    users.unshift({
      nome: process.env.SEED_OWNER_NAME?.trim() || "Owner",
      email: ownerEmail,
      cpf: process.env.SEED_OWNER_CPF?.trim() || "00000000099",
      telefone: process.env.SEED_OWNER_PHONE?.trim() || "11999999999",
      senha: ownerPassword,
      tipo: "ADMIN",
    });
  }

  return users;
}

export function rotaParaTipoSetup(tipo: string): string {
  const mapa: Record<string, string> = {
    ADMIN: "/dashboard/admin",
    GESTOR: "/dashboard/gestor",
    ENGENHEIRO: "/dashboard/engenheiro/vistoria",
    COMERCIAL: "/dashboard/comercial",
    CONSTRUTOR: "/dashboard/construtor",
    TOMADOR: "/dashboard/construtor",
  };
  return mapa[tipo] ?? "/dashboard";
}

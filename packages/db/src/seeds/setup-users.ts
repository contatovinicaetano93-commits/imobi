/** Usuários padrão de dev/staging — senhas via env (nunca commitar produção real). */
export type SetupUser = {
  nome: string;
  email: string;
  senha: string;
  role: "ADMIN" | "CLIENTE" | "FUNDO" | "ENGENHEIRO";
};

function pwd(envKey: string, fallback: string): string {
  return process.env[envKey]?.trim() || fallback;
}

export function getSetupUsers(): SetupUser[] {
  return [
    { nome: "Administrador IMOBI", email: "admin@imobi.com.br", senha: pwd("SEED_ADMIN_PASSWORD", "Admin@123"), role: "ADMIN" },
    { nome: "Fundo IMOBI", email: "fundo@imobi.com.br", senha: pwd("SEED_FUNDO_PASSWORD", "Fundo@123"), role: "FUNDO" },
    { nome: "Engenheiro IMOBI", email: "eng@imobi.com.br", senha: pwd("SEED_ENGENHEIRO_PASSWORD", "Eng@123"), role: "ENGENHEIRO" },
    { nome: "Cliente Teste", email: "cliente@imobi.com.br", senha: pwd("SEED_CLIENTE_PASSWORD", "Cliente@123"), role: "CLIENTE" },
  ];
}

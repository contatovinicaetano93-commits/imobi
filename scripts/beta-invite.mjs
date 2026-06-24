#!/usr/bin/env node
/**
 * Imprime mensagens de convite para os tomadores beta (staging).
 *
 *   pnpm beta:invite
 */
const WEB = process.env.BETA_WEB_URL ?? "https://imobi-web-ten.vercel.app";
const PASSWORD = process.env.SEED_BETA_TOMADOR_PASSWORD ?? "BetaTomador@123";

const TOMADORES = [
  { nome: "Ana", email: "beta.tomador1@imobi.com.br" },
  { nome: "Bruno", email: "beta.tomador2@imobi.com.br" },
  { nome: "Carla", email: "beta.tomador3@imobi.com.br" },
];

console.log("═══════════════════════════════════════");
console.log("  IMOBI — Convites beta (staging)");
console.log("═══════════════════════════════════════\n");

for (const t of TOMADORES) {
  console.log(`── ${t.nome} ──`);
  console.log(
    `Olá, ${t.nome}! Você foi convidado(a) para o beta do IMOBI.\n` +
      `1. Acesse: ${WEB}/login\n` +
      `2. E-mail: ${t.email}\n` +
      `3. Senha: (envie por canal seguro — padrão staging: ${PASSWORD})\n` +
      `4. Complete o KYC e cadastre sua primeira obra.\n`,
  );
}

console.log("Gestor (aprovar KYC): gestor@imobi.com.br / Gestor@123");
console.log(`Painel gestor: ${WEB}/dashboard/gestor/kyc\n`);

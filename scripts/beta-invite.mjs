#!/usr/bin/env node
/**
 * Imprime mensagens de convite para os tomadores beta (staging).
 *
 *   pnpm beta:invite
 *   pnpm beta:invite -- --whatsapp   # links wa.me (telefones em beta-invite-phones.local.json)
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB = process.env.BETA_WEB_URL ?? "https://imobi-web-ten.vercel.app";
const PASSWORD = process.env.SEED_BETA_TOMADOR_PASSWORD ?? "BetaTomador@123";
const whatsapp = process.argv.includes("--whatsapp");

const TOMADORES = [
  { nome: "Ana", email: "beta.tomador1@imobi.com.br" },
  { nome: "Bruno", email: "beta.tomador2@imobi.com.br" },
  { nome: "Carla", email: "beta.tomador3@imobi.com.br" },
];

/** @type {Record<string, string> | null} */
let phones = null;
if (whatsapp) {
  const localPath = join(__dirname, "beta-invite-phones.local.json");
  const examplePath = join(__dirname, "beta-invite-phones.example.json");
  const path = existsSync(localPath) ? localPath : examplePath;
  if (!existsSync(path)) {
    console.error("Arquivo de telefones não encontrado. Copie:");
    console.error("  cp scripts/beta-invite-phones.example.json scripts/beta-invite-phones.local.json");
    process.exit(1);
  }
  phones = JSON.parse(readFileSync(path, "utf8"));
}

function inviteMessage(t) {
  const senhaLine = whatsapp
    ? `3. Senha: ${PASSWORD}`
    : `3. Senha: (envie por canal seguro — padrão staging: ${PASSWORD})`;
  return (
    `Olá, ${t.nome}! Você foi convidado(a) para o beta do IMOBI (crédito para obras).\n\n` +
    `1. Acesse: ${WEB}/login\n` +
    `2. E-mail: ${t.email}\n` +
    `${senhaLine}\n` +
    `4. Complete o KYC e cadastre sua primeira obra.\n\n` +
    `Ambiente de testes — qualquer dúvida, responda aqui. Equipe IMOBI`
  );
}

console.log("═══════════════════════════════════════");
console.log("  IMOBI — Convites beta (staging)");
if (whatsapp) console.log("  Modo: WhatsApp (wa.me)");
console.log("═══════════════════════════════════════\n");

for (const t of TOMADORES) {
  console.log(`── ${t.nome} ──`);
  const msg = inviteMessage(t);
  if (whatsapp && phones) {
    const phone = phones[t.nome]?.replace(/\D/g, "");
    if (!phone) {
      console.warn(`⚠ Telefone ausente para ${t.nome} no JSON\n`);
      console.log(msg + "\n");
      continue;
    }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    console.log(msg + "\n");
    console.log(`WhatsApp: ${url}\n`);
  } else {
    console.log(msg + "\n");
  }
}

console.log("Gestor (aprovar KYC): gestor@imobi.com.br / Gestor@123");
console.log(`Painel gestor: ${WEB}/dashboard/gestor/kyc\n`);

/** WhatsApp financeiro IMOBI — +55 11 99345-5589 */
export const IMOBI_FINANCEIRO_WHATS_E164 = "5511993455589";

export const IMOBI_FINANCEIRO_WHATS_DISPLAY = "+55 11 99345-5589";

export function buildFinanceiroWhatsAppUrl(mensagem: string): string {
  return `https://wa.me/${IMOBI_FINANCEIRO_WHATS_E164}?text=${encodeURIComponent(mensagem)}`;
}

export function buildCapitalFaseWhatsAppMessage(params: {
  obraNome: string;
  etapaNome: string;
  valorFormatado: string;
  liberacaoId: string;
  tomadorNome: string;
}): string {
  return [
    "Olá, equipe financeira IMOBI!",
    "",
    "Solicito confirmação de pagamento — *Capital fase liberado*.",
    "",
    `*Obra:* ${params.obraNome}`,
    `*Fase/Etapa:* ${params.etapaNome}`,
    `*Valor:* ${params.valorFormatado}`,
    `*Tomador:* ${params.tomadorNome}`,
    `*Ref. liberação:* ${params.liberacaoId.slice(0, 8).toUpperCase()}`,
    "",
    "Conta cadastrada na plataforma. Aguardo confirmação do crédito.",
  ].join("\n");
}

import type { ZodError } from "zod";
import type { StatusDossie } from "@imbobi/schemas";
import type { DossieDetalhe } from "@/lib/api";

/** Props comuns a todas as etapas do wizard. */
export type StepProps = {
  dossie: DossieDetalhe;
  readOnly: boolean;
  /** Recarrega o dossiê (GET /dossies/:id) após salvar. */
  recarregar: () => Promise<void>;
  /** POST /dossies/:id/etapas/:numero/concluir + recarregar. */
  concluirEtapa: (numero: number) => Promise<void>;
};

// ── Labels e badges ───────────────────────────────────────────────────

export const STATUS_DOSSIE_LABEL: Record<StatusDossie, string> = {
  RASCUNHO: "Rascunho",
  EM_ANALISE: "Em análise",
  PENDENCIA: "Pendência",
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
};

export const STATUS_DOSSIE_BADGE: Record<StatusDossie, string> = {
  RASCUNHO: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  EM_ANALISE: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  PENDENCIA: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  APROVADO: "bg-green-50 text-green-700 ring-1 ring-green-200",
  REPROVADO: "bg-red-50 text-red-600 ring-1 ring-red-200",
};

export const STATUS_UNIDADE_LABEL: Record<string, string> = {
  VENDIDA: "Vendida",
  PERMUTA: "Permuta",
  ESTOQUE: "Estoque",
  QUITADA: "Quitada",
};

export const TIPO_EMPREENDIMENTO_LABEL: Record<string, string> = {
  RESIDENCIAL: "Residencial",
  COMERCIAL: "Comercial",
  MISTO: "Misto",
};

export const TIPO_DOCUMENTO_LABEL: Record<string, string> = {
  DEMONSTRACAO_FINANCEIRA: "Demonstração Financeira",
  APRESENTACAO_PROJETO: "Apresentação do Projeto",
  APRESENTACAO_EMPRESA: "Apresentação da Empresa",
  ORGANOGRAMA_SOCIETARIO: "Organograma Societário",
  ACORDO_PERMUTA: "Acordo de Permuta",
  CRONOGRAMA_FISICO_FINANCEIRO: "Cronograma Físico-Financeiro",
  OUTRO: "Outro documento",
};

export const FICHA_LABELS: Record<string, string> = {
  nomeEmpreendimento: "Nome do empreendimento",
  speRazaoSocial: "Razão social da SPE",
  speCnpj: "CNPJ da SPE",
  endereco: "Endereço",
  cidade: "Cidade",
  uf: "UF",
  tipoEmpreendimento: "Tipo de empreendimento",
  patrimonioAfetacao: "Patrimônio de afetação",
  areaTerrenoM2: "Área do terreno (m²)",
  areaConstruidaM2: "Área construída (m²)",
  areaPrivativaTotalM2: "Área privativa total (m²)",
  valorTerreno: "Valor do terreno",
  dataLancamento: "Data de lançamento",
  dataInicioObras: "Início das obras",
  dataPrevisaoTermino: "Previsão de término",
  dataHabiteSe: "Habite-se",
  alienacaoFiduciariaTerreno: "Alienação fiduciária do terreno",
  alienacaoFiduciariaUnidades: "Alienação fiduciária das unidades",
  seguroObra: "Seguro de obra",
  percentualEntrada: "% Entrada",
  percentualObras: "% Durante obras",
  percentualChaves: "% Chaves",
  orcamentoOriginal: "Orçamento original",
  orcamentoAtual: "Orçamento atual",
  custoIncorrido: "Custo incorrido",
  custoAIncorrer: "Custo a incorrer",
  percentualCronogramaFisico: "% Cronograma físico realizado",
  percentualCronogramaFinanceiro: "% Cronograma financeiro realizado",
};

export const EMPRESA_LABELS: Record<string, string> = {
  empresaNome: "Nome da empresa",
  empresaCnpj: "CNPJ da empresa",
  empresaWebsite: "Website",
  empresaAnoFundacao: "Ano de fundação",
};

// ── Formatação pt-BR ──────────────────────────────────────────────────

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numBR = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function fmtBRL(v: number | null | undefined): string {
  return v == null ? "—" : brl.format(v);
}

export function fmtNumero(v: number | null | undefined): string {
  return v == null ? "—" : numBR.format(v);
}

export function fmtPct(v: number | null | undefined, casas = 1): string {
  if (v == null) return "—";
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: casas }).format(v)}%`;
}

export function fmtData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function fmtDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

export function fmtCNPJ(digits: string | null | undefined): string {
  if (!digits) return "—";
  const d = digits.replace(/\D/g, "");
  if (d.length !== 14) return digits;
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

// ── Máscaras de input ────────────────────────────────────────────────

/** Aplica máscara 00.000.000/0000-00 conforme o usuário digita. */
export function maskCNPJ(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

/** Máscara CPF (11 díg.) ou CNPJ (14 díg.) conforme o tamanho. */
export function maskCpfCnpj(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  return maskCNPJ(d);
}

export function somenteDigitos(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Converte número digitado em formato BR ("1.234,56", "R$ 1.234,56", "12,5%")
 * ou US ("1234.56") para number. Retorna undefined para vazio.
 */
export function parseNumeroBR(value: string): number | undefined {
  let s = value.trim().replace(/^R\$\s*/i, "").replace(/%$/, "").trim();
  if (s === "") return undefined;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isNaN(n) ? Number.NaN : n;
}

/** Valor numérico → string de edição em formato BR ("1234.5" → "1.234,5"). */
export function numeroParaInput(v: number | null | undefined): string {
  return v == null ? "" : numBR.format(v);
}

// ── Datas ─────────────────────────────────────────────────────────────

/** ISO ("2026-01-15T00:00:00.000Z") → valor de <input type="date"> */
export function isoParaDateInput(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

/** Valor de <input type="date"> ("2026-01-15") → ISO datetime (UTC) */
export function dateInputParaISO(value: string): string | undefined {
  return value ? `${value}T00:00:00.000Z` : undefined;
}

// ── Zod helpers ───────────────────────────────────────────────────────

/** Traduz mensagens default (inglês) do Zod para pt-BR. */
export function traduzMensagemZod(msg: string): string {
  if (msg === "Required") return "Campo obrigatório";
  if (msg.startsWith("Expected number")) return "Número inválido";
  if (msg.startsWith("Expected string")) return "Texto inválido";
  if (msg.startsWith("Expected date")) return "Data inválida";
  if (msg.startsWith("Invalid datetime")) return "Data inválida";
  if (msg.startsWith("Invalid url")) return "URL inválida";
  if (msg.startsWith("Invalid")) return "Valor inválido";
  return msg;
}

/** ZodError → mapa { "caminho.do.campo": "mensagem" } (1ª mensagem por campo). */
export function errosPorCampo(error: ZodError): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!map[key]) map[key] = traduzMensagemZod(issue.message);
  }
  return map;
}

/** Remove chaves com valor null/undefined/"" de um objeto (para payloads parciais). */
export function semVazios<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined && v !== "") out[k] = v;
  }
  return out as Partial<T>;
}

// ── CSV ───────────────────────────────────────────────────────────────

/**
 * Parser CSV simples (sem dependências): suporta aspas duplas, quebras de
 * linha dentro de aspas e detecta separador ";" (padrão Excel BR) ou ",".
 */
export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const sep =
    (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let dentroAspas = false;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (dentroAspas) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroAspas = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      dentroAspas = true;
    } else if (c === sep) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") i++;
      linha.push(campo);
      campo = "";
      if (linha.some((v) => v.trim() !== "")) linhas.push(linha);
      linha = [];
    } else {
      campo += c;
    }
  }
  linha.push(campo);
  if (linha.some((v) => v.trim() !== "")) linhas.push(linha);

  if (linhas.length === 0) return { headers: [], rows: [] };

  const headers = (linhas[0] ?? []).map((h) => h.trim());
  const rows = linhas.slice(1).map((valores) => {
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) row[h] = (valores[idx] ?? "").trim();
    });
    return row;
  });
  return { headers, rows };
}

function normalizaHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

/**
 * Mapeia os headers encontrados no arquivo para os nomes canônicos esperados
 * (comparação sem acentos/maiúsculas/pontuação).
 */
export function mapearHeaders(
  encontrados: string[],
  esperados: string[]
): Record<string, string> {
  const porNorma = new Map(esperados.map((e) => [normalizaHeader(e), e]));
  const map: Record<string, string> = {};
  for (const h of encontrados) {
    const canonico = porNorma.get(normalizaHeader(h));
    if (canonico) map[h] = canonico;
  }
  return map;
}

/** Gera e baixa um arquivo CSV de modelo (separador ";", BOM p/ Excel). */
export function baixarModeloCsv(nomeArquivo: string, headers: string[], exemplo?: string[]) {
  const linhas = [headers.join(";")];
  if (exemplo) linhas.push(exemplo.join(";"));
  const blob = new Blob([`﻿${linhas.join("\n")}\n`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Submissão / completude ───────────────────────────────────────────

/** Converte null → undefined em todas as chaves (Zod .optional() rejeita null). */
export function semNulos<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined) out[k] = v;
  }
  return out;
}

/** Extrai os campos da ficha (achatados no agregado) para validação. */
export function extrairFicha(d: DossieDetalhe): Record<string, unknown> {
  const campos = Object.keys(FICHA_LABELS);
  const out: Record<string, unknown> = {};
  for (const c of campos) {
    const v = (d as Record<string, unknown>)[c];
    if (v !== null && v !== undefined) out[c] = v;
  }
  return out;
}

/** Extrai os campos da empresa desenvolvedora para validação. */
export function extrairEmpresa(d: DossieDetalhe): Record<string, unknown> {
  return semNulos({
    empresaNome: d.empresaNome,
    empresaCnpj: d.empresaCnpj,
    empresaWebsite: d.empresaWebsite,
    empresaAnoFundacao: d.empresaAnoFundacao,
  });
}

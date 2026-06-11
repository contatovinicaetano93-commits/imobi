"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  ImportRecebivelRowSchema,
  RecebivelDossieSchema,
  type RecebivelDossieInput,
} from "@imbobi/schemas";
import { dossiesApi, type DossieRecebivelItem } from "@/lib/api";
import {
  dateInputParaISO,
  fmtBRL,
  fmtNumero,
  fmtPct,
  isoParaDateInput,
  numeroParaInput,
  parseNumeroBR,
  traduzMensagemZod,
  type StepProps,
} from "./dossie-utils";
import { AcoesEtapa, BannerErro, BannerOk, ErrosLinha, inputGridCls } from "./shared";
import { ImportarPlanilha } from "./ImportarPlanilha";

const HEADERS_MODELO = [
  "numeroContrato",
  "numeroUnidade",
  "clienteNome",
  "parcelaAtual",
  "totalParcelas",
  "dataVencimento",
  "dataPagamento",
  "valorParcela",
  "valorRecebido",
];

const EXEMPLO_MODELO = [
  "CT-2025-001",
  "A-101",
  "Maria da Silva",
  "12",
  "120",
  "10/05/2026",
  "08/05/2026",
  "3.250,00",
  "3.250,00",
];

const CAMPO_LABEL: Record<string, string> = {
  numeroContrato: "Contrato",
  numeroUnidade: "Unidade",
  clienteNome: "Cliente",
  parcelaAtual: "Parcela",
  totalParcelas: "Total de parcelas",
  dataVencimento: "Vencimento",
  dataPagamento: "Pagamento",
  valorParcela: "Valor da parcela",
  valorRecebido: "Valor recebido",
};

type Linha = {
  numeroContrato: string;
  numeroUnidade: string;
  clienteNome: string;
  parcelaAtual: string;
  totalParcelas: string;
  dataVencimento: string;
  dataPagamento: string;
  valorParcela: string;
  valorRecebido: string;
};

const LINHA_VAZIA: Linha = {
  numeroContrato: "",
  numeroUnidade: "",
  clienteNome: "",
  parcelaAtual: "",
  totalParcelas: "",
  dataVencimento: "",
  dataPagamento: "",
  valorParcela: "",
  valorRecebido: "",
};

function paraLinha(r: DossieRecebivelItem): Linha {
  return {
    numeroContrato: r.numeroContrato ?? "",
    numeroUnidade: r.numeroUnidade ?? "",
    clienteNome: r.clienteNome ?? "",
    parcelaAtual: r.parcelaAtual != null ? String(r.parcelaAtual) : "",
    totalParcelas: r.totalParcelas != null ? String(r.totalParcelas) : "",
    dataVencimento: isoParaDateInput(r.dataVencimento ?? null),
    dataPagamento: isoParaDateInput(r.dataPagamento ?? null),
    valorParcela: numeroParaInput(r.valorParcela),
    valorRecebido: numeroParaInput(r.valorRecebido),
  };
}

function montarRecebivel(l: Linha): Record<string, unknown> {
  const num = (v: string) => parseNumeroBR(v);
  return {
    numeroUnidade: l.numeroUnidade.trim(),
    parcelaAtual: num(l.parcelaAtual),
    totalParcelas: num(l.totalParcelas),
    dataVencimento: dateInputParaISO(l.dataVencimento),
    valorParcela: num(l.valorParcela),
    ...(l.numeroContrato.trim() ? { numeroContrato: l.numeroContrato.trim() } : {}),
    ...(l.clienteNome.trim() ? { clienteNome: l.clienteNome.trim() } : {}),
    ...(l.dataPagamento ? { dataPagamento: dateInputParaISO(l.dataPagamento) } : {}),
    ...(num(l.valorRecebido) !== undefined ? { valorRecebido: num(l.valorRecebido) } : {}),
  };
}

export function StepRecebiveis({ dossie, readOnly, recarregar, concluirEtapa }: StepProps) {
  const [linhas, setLinhas] = useState<Linha[]>(() =>
    (dossie.recebiveis ?? []).map(paraLinha)
  );
  const [errosLinhas, setErrosLinhas] = useState<{ linha: number; mensagens: string[] }[]>([]);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const m = dossie.metricas;

  function setCampo(idx: number, campo: keyof Linha, valor: string) {
    setLinhas((prev) => prev.map((l, i) => (i === idx ? { ...l, [campo]: valor } : l)));
  }

  function validarTudo(): RecebivelDossieInput[] | null {
    const erros: { linha: number; mensagens: string[] }[] = [];
    const recebiveis: RecebivelDossieInput[] = [];
    linhas.forEach((l, idx) => {
      const parsed = RecebivelDossieSchema.safeParse(montarRecebivel(l));
      if (parsed.success) {
        recebiveis.push(parsed.data);
      } else {
        erros.push({
          linha: idx + 1,
          mensagens: parsed.error.issues.map((i) => {
            const campo = CAMPO_LABEL[String(i.path[0])] ?? String(i.path[0] ?? "");
            return `${campo ? `${campo} — ` : ""}${traduzMensagemZod(i.message)}`;
          }),
        });
      }
    });
    if (erros.length > 0) {
      setErrosLinhas(erros);
      return null;
    }
    return recebiveis;
  }

  async function salvar(concluir: boolean) {
    setErroGeral(null);
    setSucesso(null);
    setErrosLinhas([]);

    const recebiveis = validarTudo();
    if (!recebiveis) {
      setErroGeral("Corrija as linhas destacadas antes de continuar.");
      return;
    }

    setSalvando(true);
    try {
      await dossiesApi.salvarRecebiveis(dossie.dossieId, recebiveis);
      if (concluir) {
        await concluirEtapa(4);
      } else {
        await recarregar();
        setSucesso("Carteira de recebíveis salva.");
      }
    } catch (err) {
      setErroGeral(err instanceof Error ? err.message : "Erro ao salvar recebíveis");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Resumo da carteira (métricas calculadas pela API) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { rotulo: "Recebido", valor: fmtBRL(m?.valorRecebido), cls: "text-green-700", bg: "bg-green-50 border-green-100" },
          { rotulo: "A receber", valor: fmtBRL(m?.valorAReceber), cls: "text-[#1B4FD8]", bg: "bg-[#EEF3FF] border-blue-100" },
          { rotulo: "Parcelas vencidas", valor: fmtNumero(m?.parcelasVencidas), cls: "text-red-600", bg: "bg-red-50 border-red-100" },
          { rotulo: "Inadimplência", valor: fmtPct(m?.inadimplencia), cls: "text-yellow-700", bg: "bg-yellow-50 border-yellow-100" },
        ].map(({ rotulo, valor, cls, bg }) => (
          <div key={rotulo} className={`${bg} border rounded-2xl p-4`}>
            <p className="text-xs text-gray-500">
              {rotulo} <span className="text-gray-400">· calculado automaticamente</span>
            </p>
            <p className={`text-lg font-bold ${cls} mt-0.5`}>{valor}</p>
          </div>
        ))}
      </div>

      <ImportarPlanilha
        titulo="Importar carteira de recebíveis (CSV)"
        headers={HEADERS_MODELO}
        exemplo={EXEMPLO_MODELO}
        schema={ImportRecebivelRowSchema}
        nomeModelo="modelo-recebiveis.csv"
        readOnly={readOnly}
        onImportar={(rows) => dossiesApi.importarRecebiveis(dossie.dossieId, rows)}
        aoImportar={async () => {
          await recarregar();
        }}
      />

      <div className="overflow-x-auto border border-gray-100 rounded-2xl">
        <table className="w-full min-w-[980px] text-left">
          <thead className="bg-gray-50 text-[0.68rem] uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2.5 font-semibold">Contrato</th>
              <th className="px-3 py-2.5 font-semibold">Unidade *</th>
              <th className="px-3 py-2.5 font-semibold">Cliente</th>
              <th className="px-3 py-2.5 font-semibold">Parcela *</th>
              <th className="px-3 py-2.5 font-semibold">Total *</th>
              <th className="px-3 py-2.5 font-semibold">Vencimento *</th>
              <th className="px-3 py-2.5 font-semibold">Pagamento</th>
              <th className="px-3 py-2.5 font-semibold">Valor parcela (R$) *</th>
              <th className="px-3 py-2.5 font-semibold">Valor recebido (R$)</th>
              <th className="px-2 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {linhas.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400">
                  Nenhum recebível cadastrado. Adicione manualmente ou importe a planilha.
                </td>
              </tr>
            )}
            {linhas.map((l, idx) => (
              <tr key={idx} className="align-top">
                <td className="px-2 py-1.5 w-28">
                  <input
                    type="text"
                    value={l.numeroContrato}
                    onChange={(e) => setCampo(idx, "numeroContrato", e.target.value)}
                    disabled={readOnly || salvando}
                    className={inputGridCls}
                  />
                </td>
                <td className="px-2 py-1.5 w-24">
                  <input
                    type="text"
                    value={l.numeroUnidade}
                    onChange={(e) => setCampo(idx, "numeroUnidade", e.target.value)}
                    disabled={readOnly || salvando}
                    placeholder="A-101"
                    className={inputGridCls}
                  />
                </td>
                <td className="px-2 py-1.5 min-w-[140px]">
                  <input
                    type="text"
                    value={l.clienteNome}
                    onChange={(e) => setCampo(idx, "clienteNome", e.target.value)}
                    disabled={readOnly || salvando}
                    className={inputGridCls}
                  />
                </td>
                <td className="px-2 py-1.5 w-16">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={l.parcelaAtual}
                    onChange={(e) => setCampo(idx, "parcelaAtual", e.target.value)}
                    disabled={readOnly || salvando}
                    placeholder="12"
                    className={inputGridCls}
                  />
                </td>
                <td className="px-2 py-1.5 w-16">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={l.totalParcelas}
                    onChange={(e) => setCampo(idx, "totalParcelas", e.target.value)}
                    disabled={readOnly || salvando}
                    placeholder="120"
                    className={inputGridCls}
                  />
                </td>
                <td className="px-2 py-1.5 w-32">
                  <input
                    type="date"
                    value={l.dataVencimento}
                    onChange={(e) => setCampo(idx, "dataVencimento", e.target.value)}
                    disabled={readOnly || salvando}
                    className={inputGridCls}
                  />
                </td>
                <td className="px-2 py-1.5 w-32">
                  <input
                    type="date"
                    value={l.dataPagamento}
                    onChange={(e) => setCampo(idx, "dataPagamento", e.target.value)}
                    disabled={readOnly || salvando}
                    className={inputGridCls}
                  />
                </td>
                <td className="px-2 py-1.5 w-28">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={l.valorParcela}
                    onChange={(e) => setCampo(idx, "valorParcela", e.target.value)}
                    disabled={readOnly || salvando}
                    placeholder="3.250,00"
                    className={inputGridCls}
                  />
                </td>
                <td className="px-2 py-1.5 w-28">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={l.valorRecebido}
                    onChange={(e) => setCampo(idx, "valorRecebido", e.target.value)}
                    disabled={readOnly || salvando}
                    className={inputGridCls}
                  />
                </td>
                <td className="px-2 py-1.5 w-8">
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setLinhas((prev) => prev.filter((_, i) => i !== idx))}
                      disabled={salvando}
                      title="Remover linha"
                      className="text-gray-300 hover:text-red-500 transition-colors mt-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        {!readOnly && (
          <button
            type="button"
            onClick={() => setLinhas((prev) => [...prev, { ...LINHA_VAZIA }])}
            disabled={salvando}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1B4FD8] hover:text-blue-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar recebível
          </button>
        )}
        <p className="text-xs text-gray-400 ml-auto">
          {linhas.length} parcela{linhas.length !== 1 ? "s" : ""}
        </p>
      </div>

      <ErrosLinha titulo="Corrija as linhas do grid:" erros={errosLinhas} />
      {erroGeral && <BannerErro>{erroGeral}</BannerErro>}
      {sucesso && <BannerOk>{sucesso}</BannerOk>}

      <AcoesEtapa
        readOnly={readOnly}
        salvando={salvando}
        concluida={dossie.etapasConcluidas.includes(4)}
        onSalvar={() => void salvar(false)}
        onConcluir={() => void salvar(true)}
      />
    </div>
  );
}

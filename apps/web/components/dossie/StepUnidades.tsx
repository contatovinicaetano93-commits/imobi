"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  ImportUnidadeRowSchema,
  SistemaAmortizacaoEnum,
  StatusUnidadeDossieEnum,
  UnidadeDossieSchema,
  type UnidadeDossieInput,
} from "@imbobi/schemas";
import { dossiesApi, type DossieUnidadeItem } from "@/lib/api";
import {
  dateInputParaISO,
  isoParaDateInput,
  maskCpfCnpj,
  numeroParaInput,
  parseNumeroBR,
  somenteDigitos,
  STATUS_UNIDADE_LABEL,
  traduzMensagemZod,
  type StepProps,
} from "./dossie-utils";
import { AcoesEtapa, BannerErro, BannerOk, ErrosLinha, inputGridCls } from "./shared";
import { ImportarPlanilha } from "./ImportarPlanilha";

const HEADERS_MODELO = [
  "numeroUnidade",
  "status",
  "areaPrivativaM2",
  "numeroContrato",
  "clienteNome",
  "clienteCpfCnpj",
  "dataVenda",
  "valorVenda",
  "valorTabela",
  "indexador",
  "taxaJurosMensal",
  "sistemaAmortizacao",
];

const EXEMPLO_MODELO = [
  "A-101",
  "VENDIDA",
  "72,50",
  "CT-2025-001",
  "Maria da Silva",
  "123.456.789-01",
  "15/03/2025",
  "450.000,00",
  "460.000,00",
  "INCC",
  "0,8",
  "PRICE",
];

const CAMPO_LABEL: Record<string, string> = {
  numeroContrato: "Contrato",
  numeroUnidade: "Unidade",
  areaPrivativaM2: "Área privativa (m²)",
  clienteNome: "Cliente",
  clienteCpfCnpj: "CPF/CNPJ",
  dataVenda: "Data da venda",
  valorVenda: "Valor da venda",
  valorTabela: "Valor de tabela",
  status: "Status",
  indexador: "Indexador",
  taxaJurosMensal: "Taxa (% a.m.)",
  sistemaAmortizacao: "Amortização",
};

type Linha = {
  numeroUnidade: string;
  status: string;
  areaPrivativaM2: string;
  numeroContrato: string;
  clienteNome: string;
  clienteCpfCnpj: string;
  dataVenda: string;
  valorVenda: string;
  valorTabela: string;
  indexador: string;
  taxaJurosMensal: string;
  sistemaAmortizacao: string;
};

const LINHA_VAZIA: Linha = {
  numeroUnidade: "",
  status: "ESTOQUE",
  areaPrivativaM2: "",
  numeroContrato: "",
  clienteNome: "",
  clienteCpfCnpj: "",
  dataVenda: "",
  valorVenda: "",
  valorTabela: "",
  indexador: "",
  taxaJurosMensal: "",
  sistemaAmortizacao: "",
};

function paraLinha(u: DossieUnidadeItem): Linha {
  return {
    numeroUnidade: u.numeroUnidade ?? "",
    status: u.status ?? "ESTOQUE",
    areaPrivativaM2: numeroParaInput(u.areaPrivativaM2),
    numeroContrato: u.numeroContrato ?? "",
    clienteNome: u.clienteNome ?? "",
    clienteCpfCnpj: maskCpfCnpj(u.clienteCpfCnpj ?? ""),
    dataVenda: isoParaDateInput(u.dataVenda ?? null),
    valorVenda: numeroParaInput(u.valorVenda),
    valorTabela: numeroParaInput(u.valorTabela),
    indexador: u.indexador ?? "",
    taxaJurosMensal: numeroParaInput(u.taxaJurosMensal),
    sistemaAmortizacao: u.sistemaAmortizacao ?? "",
  };
}

function montarUnidade(l: Linha): Record<string, unknown> {
  const num = (v: string) => {
    const n = parseNumeroBR(v);
    return n === undefined ? undefined : n;
  };
  return {
    numeroUnidade: l.numeroUnidade.trim(),
    status: l.status,
    areaPrivativaM2: num(l.areaPrivativaM2),
    ...(l.numeroContrato.trim() ? { numeroContrato: l.numeroContrato.trim() } : {}),
    ...(l.clienteNome.trim() ? { clienteNome: l.clienteNome.trim() } : {}),
    ...(somenteDigitos(l.clienteCpfCnpj)
      ? { clienteCpfCnpj: somenteDigitos(l.clienteCpfCnpj) }
      : {}),
    ...(l.dataVenda ? { dataVenda: dateInputParaISO(l.dataVenda) } : {}),
    ...(num(l.valorVenda) !== undefined ? { valorVenda: num(l.valorVenda) } : {}),
    ...(num(l.valorTabela) !== undefined ? { valorTabela: num(l.valorTabela) } : {}),
    ...(l.indexador.trim() ? { indexador: l.indexador.trim() } : {}),
    ...(num(l.taxaJurosMensal) !== undefined
      ? { taxaJurosMensal: num(l.taxaJurosMensal) }
      : {}),
    ...(l.sistemaAmortizacao ? { sistemaAmortizacao: l.sistemaAmortizacao } : {}),
  };
}

export function StepUnidades({ dossie, readOnly, recarregar, concluirEtapa }: StepProps) {
  const [linhas, setLinhas] = useState<Linha[]>(() =>
    (dossie.unidades ?? []).map(paraLinha)
  );
  const [errosLinhas, setErrosLinhas] = useState<{ linha: number; mensagens: string[] }[]>([]);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function setCampo(idx: number, campo: keyof Linha, valor: string) {
    setLinhas((prev) => prev.map((l, i) => (i === idx ? { ...l, [campo]: valor } : l)));
  }

  function validarTudo(): { unidades: UnidadeDossieInput[] } | null {
    const erros: { linha: number; mensagens: string[] }[] = [];
    const unidades: UnidadeDossieInput[] = [];
    linhas.forEach((l, idx) => {
      const parsed = UnidadeDossieSchema.safeParse(montarUnidade(l));
      if (parsed.success) {
        unidades.push(parsed.data);
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
    return { unidades };
  }

  async function salvar(concluir: boolean) {
    setErroGeral(null);
    setSucesso(null);
    setErrosLinhas([]);

    if (concluir && linhas.length === 0) {
      setErroGeral("Inclua ao menos uma unidade (manualmente ou via importação).");
      return;
    }

    const ok = validarTudo();
    if (!ok) {
      setErroGeral("Corrija as linhas destacadas antes de continuar.");
      return;
    }

    setSalvando(true);
    try {
      await dossiesApi.salvarUnidades(dossie.dossieId, ok.unidades);
      if (concluir) {
        await concluirEtapa(2);
      } else {
        await recarregar();
        setSucesso("Tabela de unidades salva.");
      }
    } catch (err) {
      setErroGeral(err instanceof Error ? err.message : "Erro ao salvar unidades");
    } finally {
      setSalvando(false);
    }
  }

  const totalPermuta = linhas.filter((l) => l.status === "PERMUTA").length;

  return (
    <div className="space-y-6">
      <ImportarPlanilha
        titulo="Importar tabela de unidades (CSV)"
        headers={HEADERS_MODELO}
        exemplo={EXEMPLO_MODELO}
        schema={ImportUnidadeRowSchema}
        nomeModelo="modelo-unidades.csv"
        readOnly={readOnly}
        onImportar={(rows) => dossiesApi.importarUnidades(dossie.dossieId, rows)}
        aoImportar={async () => {
          await recarregar();
        }}
      />

      <div className="overflow-x-auto border border-gray-100 rounded-2xl">
        <table className="w-full min-w-[1100px] text-left">
          <thead className="bg-gray-50 text-[0.68rem] uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2.5 font-semibold">Unidade *</th>
              <th className="px-3 py-2.5 font-semibold">Status *</th>
              <th className="px-3 py-2.5 font-semibold">Área (m²) *</th>
              <th className="px-3 py-2.5 font-semibold">Contrato</th>
              <th className="px-3 py-2.5 font-semibold">Cliente</th>
              <th className="px-3 py-2.5 font-semibold">CPF/CNPJ</th>
              <th className="px-3 py-2.5 font-semibold">Data venda</th>
              <th className="px-3 py-2.5 font-semibold">Valor venda (R$)</th>
              <th className="px-3 py-2.5 font-semibold">Valor tabela (R$)</th>
              <th className="px-3 py-2.5 font-semibold">Indexador</th>
              <th className="px-3 py-2.5 font-semibold">Taxa % a.m.</th>
              <th className="px-3 py-2.5 font-semibold">Amortização</th>
              <th className="px-2 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {linhas.length === 0 && (
              <tr>
                <td colSpan={13} className="px-4 py-8 text-center text-sm text-gray-400">
                  Nenhuma unidade cadastrada. Adicione manualmente ou importe a planilha.
                </td>
              </tr>
            )}
            {linhas.map((l, idx) => (
              <tr key={idx} className="align-top">
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
                <td className="px-2 py-1.5 w-28">
                  <select
                    value={l.status}
                    onChange={(e) => setCampo(idx, "status", e.target.value)}
                    disabled={readOnly || salvando}
                    className={inputGridCls}
                  >
                    {StatusUnidadeDossieEnum.options.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_UNIDADE_LABEL[s] ?? s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5 w-24">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={l.areaPrivativaM2}
                    onChange={(e) => setCampo(idx, "areaPrivativaM2", e.target.value)}
                    disabled={readOnly || salvando}
                    placeholder="72,5"
                    className={inputGridCls}
                  />
                </td>
                <td className="px-2 py-1.5 w-28">
                  <input
                    type="text"
                    value={l.numeroContrato}
                    onChange={(e) => setCampo(idx, "numeroContrato", e.target.value)}
                    disabled={readOnly || salvando}
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
                <td className="px-2 py-1.5 w-36">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={l.clienteCpfCnpj}
                    onChange={(e) => setCampo(idx, "clienteCpfCnpj", maskCpfCnpj(e.target.value))}
                    disabled={readOnly || salvando}
                    className={inputGridCls}
                  />
                </td>
                <td className="px-2 py-1.5 w-32">
                  <input
                    type="date"
                    value={l.dataVenda}
                    onChange={(e) => setCampo(idx, "dataVenda", e.target.value)}
                    disabled={readOnly || salvando}
                    className={inputGridCls}
                  />
                </td>
                <td className="px-2 py-1.5 w-28">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={l.valorVenda}
                    onChange={(e) => setCampo(idx, "valorVenda", e.target.value)}
                    disabled={readOnly || salvando}
                    className={inputGridCls}
                  />
                </td>
                <td className="px-2 py-1.5 w-28">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={l.valorTabela}
                    onChange={(e) => setCampo(idx, "valorTabela", e.target.value)}
                    disabled={readOnly || salvando}
                    className={inputGridCls}
                  />
                </td>
                <td className="px-2 py-1.5 w-20">
                  <input
                    type="text"
                    value={l.indexador}
                    onChange={(e) => setCampo(idx, "indexador", e.target.value)}
                    disabled={readOnly || salvando}
                    placeholder="INCC"
                    className={inputGridCls}
                  />
                </td>
                <td className="px-2 py-1.5 w-20">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={l.taxaJurosMensal}
                    onChange={(e) => setCampo(idx, "taxaJurosMensal", e.target.value)}
                    disabled={readOnly || salvando}
                    className={inputGridCls}
                  />
                </td>
                <td className="px-2 py-1.5 w-24">
                  <select
                    value={l.sistemaAmortizacao}
                    onChange={(e) => setCampo(idx, "sistemaAmortizacao", e.target.value)}
                    disabled={readOnly || salvando}
                    className={inputGridCls}
                  >
                    <option value="">—</option>
                    {SistemaAmortizacaoEnum.options.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
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
            Adicionar unidade
          </button>
        )}
        <p className="text-xs text-gray-400 ml-auto">
          {linhas.length} unidade{linhas.length !== 1 ? "s" : ""}
          {totalPermuta > 0 && ` · ${totalPermuta} em permuta`}
        </p>
      </div>

      <ErrosLinha titulo="Corrija as linhas do grid:" erros={errosLinhas} />
      {erroGeral && <BannerErro>{erroGeral}</BannerErro>}
      {sucesso && <BannerOk>{sucesso}</BannerOk>}

      <AcoesEtapa
        readOnly={readOnly}
        salvando={salvando}
        concluida={dossie.etapasConcluidas.includes(2)}
        onSalvar={() => void salvar(false)}
        onConcluir={() => void salvar(true)}
      />
    </div>
  );
}

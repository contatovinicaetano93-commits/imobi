"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  AtualizarEmpresaDesenvolvedoraSchema,
  DistratoDossieSchema,
  EmpresaDesenvolvedoraSchema,
  type DistratoDossieInput,
} from "@imbobi/schemas";
import { dossiesApi, type DossieDistratoItem } from "@/lib/api";
import {
  dateInputParaISO,
  errosPorCampo,
  isoParaDateInput,
  maskCNPJ,
  numeroParaInput,
  parseNumeroBR,
  somenteDigitos,
  traduzMensagemZod,
  type StepProps,
} from "./dossie-utils";
import {
  AcoesEtapa,
  BannerErro,
  BannerOk,
  Campo,
  ErrosLinha,
  inputCls,
  inputGridCls,
  Secao,
} from "./shared";
import { DocumentoUploadSlot } from "./DocumentoUploadSlot";

type LinhaDistrato = {
  numeroContrato: string;
  numeroUnidade: string;
  clienteNome: string;
  dataVenda: string;
  dataDistrato: string;
  valorRecebido: string;
  valorRestituido: string;
  motivo: string;
};

const DISTRATO_VAZIO: LinhaDistrato = {
  numeroContrato: "",
  numeroUnidade: "",
  clienteNome: "",
  dataVenda: "",
  dataDistrato: "",
  valorRecebido: "",
  valorRestituido: "",
  motivo: "",
};

const DISTRATO_LABEL: Record<string, string> = {
  numeroContrato: "Contrato",
  numeroUnidade: "Unidade",
  clienteNome: "Cliente",
  dataVenda: "Data da venda",
  dataDistrato: "Data do distrato",
  valorRecebido: "Valor recebido",
  valorRestituido: "Valor restituído",
  motivo: "Motivo",
};

function paraLinhaDistrato(d: DossieDistratoItem): LinhaDistrato {
  return {
    numeroContrato: d.numeroContrato ?? "",
    numeroUnidade: d.numeroUnidade ?? "",
    clienteNome: d.clienteNome ?? "",
    dataVenda: isoParaDateInput(d.dataVenda ?? null),
    dataDistrato: isoParaDateInput(d.dataDistrato ?? null),
    valorRecebido: numeroParaInput(d.valorRecebido),
    valorRestituido: numeroParaInput(d.valorRestituido),
    motivo: d.motivo ?? "",
  };
}

function montarDistrato(l: LinhaDistrato): Record<string, unknown> {
  const num = (v: string) => parseNumeroBR(v);
  return {
    numeroUnidade: l.numeroUnidade.trim(),
    dataDistrato: dateInputParaISO(l.dataDistrato),
    ...(l.numeroContrato.trim() ? { numeroContrato: l.numeroContrato.trim() } : {}),
    ...(l.clienteNome.trim() ? { clienteNome: l.clienteNome.trim() } : {}),
    ...(l.dataVenda ? { dataVenda: dateInputParaISO(l.dataVenda) } : {}),
    ...(num(l.valorRecebido) !== undefined ? { valorRecebido: num(l.valorRecebido) } : {}),
    ...(num(l.valorRestituido) !== undefined
      ? { valorRestituido: num(l.valorRestituido) }
      : {}),
    ...(l.motivo.trim() ? { motivo: l.motivo.trim() } : {}),
  };
}

export function StepEmpresa({ dossie, readOnly, recarregar, concluirEtapa }: StepProps) {
  const anoBase = new Date().getFullYear() - 1;
  const documentos = dossie.documentos ?? [];
  const docsDF = documentos.filter((d) => d.tipo === "DEMONSTRACAO_FINANCEIRA");

  const [form, setForm] = useState({
    empresaNome: dossie.empresaNome ?? "",
    empresaCnpj: maskCNPJ(dossie.empresaCnpj ?? ""),
    empresaWebsite: dossie.empresaWebsite ?? "",
    empresaAnoFundacao: dossie.empresaAnoFundacao != null ? String(dossie.empresaAnoFundacao) : "",
  });
  const [anosDF, setAnosDF] = useState<string[]>(() => {
    const existentes = [...new Set(docsDF.map((d) => d.anoExercicio).filter((a) => a != null))]
      .sort((a, b) => (b ?? 0) - (a ?? 0))
      .map(String);
    const padrao = [String(anoBase), String(anoBase - 1), String(anoBase - 2)];
    return [0, 1, 2].map((i) => existentes[i] ?? padrao[i] ?? "");
  });
  const [distratos, setDistratos] = useState<LinhaDistrato[]>(() =>
    (dossie.distratos ?? []).map(paraLinhaDistrato)
  );
  const [erros, setErros] = useState<Record<string, string>>({});
  const [errosDistratos, setErrosDistratos] = useState<{ linha: number; mensagens: string[] }[]>([]);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function setDistratoCampo(idx: number, campo: keyof LinhaDistrato, valor: string) {
    setDistratos((prev) => prev.map((l, i) => (i === idx ? { ...l, [campo]: valor } : l)));
  }

  function montarEmpresa(): Record<string, unknown> {
    const p: Record<string, unknown> = {};
    if (form.empresaNome.trim()) p["empresaNome"] = form.empresaNome.trim();
    if (somenteDigitos(form.empresaCnpj)) p["empresaCnpj"] = somenteDigitos(form.empresaCnpj);
    if (form.empresaWebsite.trim()) p["empresaWebsite"] = form.empresaWebsite.trim();
    const ano = parseNumeroBR(form.empresaAnoFundacao);
    if (ano !== undefined) p["empresaAnoFundacao"] = ano;
    return p;
  }

  function validarDistratos(): DistratoDossieInput[] | null {
    const errosL: { linha: number; mensagens: string[] }[] = [];
    const out: DistratoDossieInput[] = [];
    distratos.forEach((l, idx) => {
      const parsed = DistratoDossieSchema.safeParse(montarDistrato(l));
      if (parsed.success) {
        out.push(parsed.data);
      } else {
        errosL.push({
          linha: idx + 1,
          mensagens: parsed.error.issues.map((i) => {
            const campo = DISTRATO_LABEL[String(i.path[0])] ?? String(i.path[0] ?? "");
            return `${campo ? `${campo} — ` : ""}${traduzMensagemZod(i.message)}`;
          }),
        });
      }
    });
    if (errosL.length > 0) {
      setErrosDistratos(errosL);
      return null;
    }
    return out;
  }

  async function salvar(concluir: boolean) {
    setErroGeral(null);
    setSucesso(null);
    setErros({});
    setErrosDistratos([]);

    const schema = concluir ? EmpresaDesenvolvedoraSchema : AtualizarEmpresaDesenvolvedoraSchema;
    const parsedEmpresa = schema.safeParse(montarEmpresa());
    if (!parsedEmpresa.success) {
      setErros(errosPorCampo(parsedEmpresa.error));
      setErroGeral("Corrija os campos destacados antes de continuar.");
      return;
    }

    const distratosValidos = validarDistratos();
    if (!distratosValidos) {
      setErroGeral("Corrija as linhas de distratos antes de continuar.");
      return;
    }

    if (concluir && docsDF.length < 3) {
      setErroGeral(
        "Anexe as demonstrações financeiras dos 3 últimos exercícios antes de concluir a etapa."
      );
      return;
    }

    setSalvando(true);
    try {
      await dossiesApi.atualizarEmpresa(dossie.dossieId, parsedEmpresa.data);
      await dossiesApi.salvarDistratos(dossie.dossieId, distratosValidos);
      if (concluir) {
        await concluirEtapa(6);
      } else {
        await recarregar();
        setSucesso("Dados da empresa salvos.");
      }
    } catch (err) {
      setErroGeral(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-8">
      <Secao titulo="Empresa desenvolvedora / controladora">
        <div className="grid md:grid-cols-2 gap-4">
          <Campo label="Nome da empresa" erro={erros["empresaNome"]}>
            <input
              type="text"
              value={form.empresaNome}
              onChange={(e) => setForm((p) => ({ ...p, empresaNome: e.target.value }))}
              disabled={readOnly || salvando}
              placeholder="Construtora Exemplo S.A."
              className={inputCls}
            />
          </Campo>
          <Campo label="CNPJ da empresa" erro={erros["empresaCnpj"]}>
            <input
              type="text"
              inputMode="numeric"
              value={form.empresaCnpj}
              onChange={(e) => setForm((p) => ({ ...p, empresaCnpj: maskCNPJ(e.target.value) }))}
              disabled={readOnly || salvando}
              placeholder="00.000.000/0000-00"
              className={inputCls}
            />
          </Campo>
          <Campo label="Website" opcional erro={erros["empresaWebsite"]}>
            <input
              type="url"
              value={form.empresaWebsite}
              onChange={(e) => setForm((p) => ({ ...p, empresaWebsite: e.target.value }))}
              disabled={readOnly || salvando}
              placeholder="https://empresa.com.br"
              className={inputCls}
            />
          </Campo>
          <Campo label="Ano de fundação" erro={erros["empresaAnoFundacao"]}>
            <input
              type="text"
              inputMode="numeric"
              value={form.empresaAnoFundacao}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  empresaAnoFundacao: e.target.value.replace(/\D/g, "").slice(0, 4),
                }))
              }
              disabled={readOnly || salvando}
              placeholder="1998"
              className={inputCls}
            />
          </Campo>
        </div>
      </Secao>

      <Secao titulo="Demonstrações financeiras — 3 últimos exercícios">
        <p className="text-xs text-gray-400 -mt-2">
          Anexe uma demonstração financeira por exercício (3 obrigatórias). Informe o ano de
          cada exercício.
        </p>
        <div className="space-y-3">
          {[0, 1, 2].map((slot) => {
            const ano = parseInt(anosDF[slot] ?? "", 10);
            const anoValido = !Number.isNaN(ano);
            const docsDoAno = anoValido
              ? docsDF.filter((d) => d.anoExercicio === ano)
              : [];
            return (
              <div key={slot} className="flex flex-col md:flex-row gap-3 md:items-start">
                <div className="w-full md:w-40 shrink-0">
                  <Campo label={`Exercício ${slot + 1}`}>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={anosDF[slot] ?? ""}
                      onChange={(e) =>
                        setAnosDF((prev) =>
                          prev.map((a, i) =>
                            i === slot ? e.target.value.replace(/\D/g, "").slice(0, 4) : a
                          )
                        )
                      }
                      disabled={readOnly || salvando}
                      placeholder={String(anoBase - slot)}
                      className={inputCls}
                    />
                  </Campo>
                </div>
                <div className="flex-1">
                  <DocumentoUploadSlot
                    dossieId={dossie.dossieId}
                    tipo="DEMONSTRACAO_FINANCEIRA"
                    titulo="Demonstração Financeira"
                    descricaoSlot={
                      anoValido
                        ? undefined
                        : "Informe o ano do exercício para habilitar o envio."
                    }
                    anoExercicio={anoValido ? ano : undefined}
                    documentos={docsDoAno}
                    readOnly={readOnly || !anoValido}
                    aoAlterar={recarregar}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Secao>

      <Secao titulo="Organograma e apresentações">
        <div className="space-y-3">
          <DocumentoUploadSlot
            dossieId={dossie.dossieId}
            tipo="ORGANOGRAMA_SOCIETARIO"
            descricaoSlot="Estrutura societária do grupo (PDF ou imagem)."
            documentos={documentos.filter((d) => d.tipo === "ORGANOGRAMA_SOCIETARIO")}
            readOnly={readOnly}
            aoAlterar={recarregar}
          />
          <DocumentoUploadSlot
            dossieId={dossie.dossieId}
            tipo="APRESENTACAO_EMPRESA"
            descricaoSlot="Apresentação institucional da empresa/grupo."
            documentos={documentos.filter((d) => d.tipo === "APRESENTACAO_EMPRESA")}
            readOnly={readOnly}
            multiplos
            aoAlterar={recarregar}
          />
          <DocumentoUploadSlot
            dossieId={dossie.dossieId}
            tipo="APRESENTACAO_PROJETO"
            descricaoSlot="Apresentação comercial/técnica do empreendimento."
            documentos={documentos.filter((d) => d.tipo === "APRESENTACAO_PROJETO")}
            readOnly={readOnly}
            multiplos
            aoAlterar={recarregar}
          />
        </div>
      </Secao>

      <Secao titulo="Distratos (opcional)">
        <p className="text-xs text-gray-400 -mt-2">
          Registre os distratos ocorridos no empreendimento, se houver.
        </p>
        <div className="overflow-x-auto border border-gray-100 rounded-2xl">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-gray-50 text-[0.68rem] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Contrato</th>
                <th className="px-3 py-2.5 font-semibold">Unidade *</th>
                <th className="px-3 py-2.5 font-semibold">Cliente</th>
                <th className="px-3 py-2.5 font-semibold">Data venda</th>
                <th className="px-3 py-2.5 font-semibold">Data distrato *</th>
                <th className="px-3 py-2.5 font-semibold">Recebido (R$)</th>
                <th className="px-3 py-2.5 font-semibold">Restituído (R$)</th>
                <th className="px-3 py-2.5 font-semibold">Motivo</th>
                <th className="px-2 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {distratos.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-sm text-gray-400">
                    Nenhum distrato registrado.
                  </td>
                </tr>
              )}
              {distratos.map((l, idx) => (
                <tr key={idx} className="align-top">
                  <td className="px-2 py-1.5 w-28">
                    <input
                      type="text"
                      value={l.numeroContrato}
                      onChange={(e) => setDistratoCampo(idx, "numeroContrato", e.target.value)}
                      disabled={readOnly || salvando}
                      className={inputGridCls}
                    />
                  </td>
                  <td className="px-2 py-1.5 w-24">
                    <input
                      type="text"
                      value={l.numeroUnidade}
                      onChange={(e) => setDistratoCampo(idx, "numeroUnidade", e.target.value)}
                      disabled={readOnly || salvando}
                      placeholder="A-101"
                      className={inputGridCls}
                    />
                  </td>
                  <td className="px-2 py-1.5 min-w-[130px]">
                    <input
                      type="text"
                      value={l.clienteNome}
                      onChange={(e) => setDistratoCampo(idx, "clienteNome", e.target.value)}
                      disabled={readOnly || salvando}
                      className={inputGridCls}
                    />
                  </td>
                  <td className="px-2 py-1.5 w-32">
                    <input
                      type="date"
                      value={l.dataVenda}
                      onChange={(e) => setDistratoCampo(idx, "dataVenda", e.target.value)}
                      disabled={readOnly || salvando}
                      className={inputGridCls}
                    />
                  </td>
                  <td className="px-2 py-1.5 w-32">
                    <input
                      type="date"
                      value={l.dataDistrato}
                      onChange={(e) => setDistratoCampo(idx, "dataDistrato", e.target.value)}
                      disabled={readOnly || salvando}
                      className={inputGridCls}
                    />
                  </td>
                  <td className="px-2 py-1.5 w-28">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={l.valorRecebido}
                      onChange={(e) => setDistratoCampo(idx, "valorRecebido", e.target.value)}
                      disabled={readOnly || salvando}
                      className={inputGridCls}
                    />
                  </td>
                  <td className="px-2 py-1.5 w-28">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={l.valorRestituido}
                      onChange={(e) => setDistratoCampo(idx, "valorRestituido", e.target.value)}
                      disabled={readOnly || salvando}
                      className={inputGridCls}
                    />
                  </td>
                  <td className="px-2 py-1.5 min-w-[140px]">
                    <input
                      type="text"
                      value={l.motivo}
                      onChange={(e) => setDistratoCampo(idx, "motivo", e.target.value)}
                      disabled={readOnly || salvando}
                      className={inputGridCls}
                    />
                  </td>
                  <td className="px-2 py-1.5 w-8">
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => setDistratos((prev) => prev.filter((_, i) => i !== idx))}
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
        {!readOnly && (
          <button
            type="button"
            onClick={() => setDistratos((prev) => [...prev, { ...DISTRATO_VAZIO }])}
            disabled={salvando}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1B4FD8] hover:text-blue-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar distrato
          </button>
        )}
      </Secao>

      <ErrosLinha titulo="Corrija as linhas de distratos:" erros={errosDistratos} />
      {erroGeral && <BannerErro>{erroGeral}</BannerErro>}
      {sucesso && <BannerOk>{sucesso}</BannerOk>}

      <AcoesEtapa
        readOnly={readOnly}
        salvando={salvando}
        concluida={dossie.etapasConcluidas.includes(6)}
        onSalvar={() => void salvar(false)}
        onConcluir={() => void salvar(true)}
      />
    </div>
  );
}

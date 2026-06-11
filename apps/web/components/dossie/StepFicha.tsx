"use client";

import { useState } from "react";
import {
  AtualizarFichaEmpreendimentoSchema,
  FichaEmpreendimentoSchema,
  TipoEmpreendimentoEnum,
} from "@imbobi/schemas";
import { dossiesApi } from "@/lib/api";
import {
  dateInputParaISO,
  errosPorCampo,
  fmtBRL,
  fmtPct,
  isoParaDateInput,
  maskCNPJ,
  numeroParaInput,
  parseNumeroBR,
  somenteDigitos,
  TIPO_EMPREENDIMENTO_LABEL,
  type StepProps,
} from "./dossie-utils";
import {
  AcoesEtapa,
  BannerErro,
  BannerOk,
  Campo,
  ChipCalculado,
  inputCls,
  Secao,
} from "./shared";

type FichaForm = {
  nomeEmpreendimento: string;
  speRazaoSocial: string;
  speCnpj: string; // com máscara
  endereco: string;
  cidade: string;
  uf: string;
  tipoEmpreendimento: string;
  patrimonioAfetacao: boolean;
  areaTerrenoM2: string;
  areaConstruidaM2: string;
  areaPrivativaTotalM2: string;
  valorTerreno: string;
  dataLancamento: string;
  dataInicioObras: string;
  dataPrevisaoTermino: string;
  dataHabiteSe: string;
  alienacaoFiduciariaTerreno: boolean;
  alienacaoFiduciariaUnidades: boolean;
  seguroObra: boolean;
  percentualEntrada: string;
  percentualObras: string;
  percentualChaves: string;
  orcamentoOriginal: string;
  orcamentoAtual: string;
  custoIncorrido: string;
  custoAIncorrer: string;
  percentualCronogramaFisico: string;
  percentualCronogramaFinanceiro: string;
};

export function StepFicha({ dossie, readOnly, recarregar, concluirEtapa }: StepProps) {
  const [form, setForm] = useState<FichaForm>(() => ({
    nomeEmpreendimento: dossie.nomeEmpreendimento ?? "",
    speRazaoSocial: dossie.speRazaoSocial ?? "",
    speCnpj: maskCNPJ(dossie.speCnpj ?? ""),
    endereco: dossie.endereco ?? "",
    cidade: dossie.cidade ?? "",
    uf: dossie.uf ?? "",
    tipoEmpreendimento: dossie.tipoEmpreendimento ?? "",
    patrimonioAfetacao: dossie.patrimonioAfetacao ?? false,
    areaTerrenoM2: numeroParaInput(dossie.areaTerrenoM2),
    areaConstruidaM2: numeroParaInput(dossie.areaConstruidaM2),
    areaPrivativaTotalM2: numeroParaInput(dossie.areaPrivativaTotalM2),
    valorTerreno: numeroParaInput(dossie.valorTerreno),
    dataLancamento: isoParaDateInput(dossie.dataLancamento),
    dataInicioObras: isoParaDateInput(dossie.dataInicioObras),
    dataPrevisaoTermino: isoParaDateInput(dossie.dataPrevisaoTermino),
    dataHabiteSe: isoParaDateInput(dossie.dataHabiteSe),
    alienacaoFiduciariaTerreno: dossie.alienacaoFiduciariaTerreno ?? false,
    alienacaoFiduciariaUnidades: dossie.alienacaoFiduciariaUnidades ?? false,
    seguroObra: dossie.seguroObra ?? false,
    percentualEntrada: numeroParaInput(dossie.percentualEntrada),
    percentualObras: numeroParaInput(dossie.percentualObras),
    percentualChaves: numeroParaInput(dossie.percentualChaves),
    orcamentoOriginal: numeroParaInput(dossie.orcamentoOriginal),
    orcamentoAtual: numeroParaInput(dossie.orcamentoAtual),
    custoIncorrido: numeroParaInput(dossie.custoIncorrido),
    custoAIncorrer: numeroParaInput(dossie.custoAIncorrer),
    percentualCronogramaFisico: numeroParaInput(dossie.percentualCronogramaFisico),
    percentualCronogramaFinanceiro: numeroParaInput(dossie.percentualCronogramaFinanceiro),
  }));
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const m = dossie.metricas;

  function set<K extends keyof FichaForm>(campo: K, valor: FichaForm[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  /** Monta o payload parcial: campos texto/número/data só entram se preenchidos. */
  function montarPayload(): Record<string, unknown> {
    const p: Record<string, unknown> = {
      patrimonioAfetacao: form.patrimonioAfetacao,
      alienacaoFiduciariaTerreno: form.alienacaoFiduciariaTerreno,
      alienacaoFiduciariaUnidades: form.alienacaoFiduciariaUnidades,
      seguroObra: form.seguroObra,
    };
    const texto = (k: keyof FichaForm) => {
      const v = (form[k] as string).trim();
      if (v) p[k] = v;
    };
    const numero = (k: keyof FichaForm) => {
      const v = parseNumeroBR(form[k] as string);
      if (v !== undefined) p[k] = v;
    };
    const data = (k: keyof FichaForm) => {
      const v = dateInputParaISO(form[k] as string);
      if (v) p[k] = v;
    };

    texto("nomeEmpreendimento");
    texto("speRazaoSocial");
    if (somenteDigitos(form.speCnpj)) p["speCnpj"] = somenteDigitos(form.speCnpj);
    texto("endereco");
    texto("cidade");
    if (form.uf.trim()) p["uf"] = form.uf.trim().toUpperCase();
    if (form.tipoEmpreendimento) p["tipoEmpreendimento"] = form.tipoEmpreendimento;
    numero("areaTerrenoM2");
    numero("areaConstruidaM2");
    numero("areaPrivativaTotalM2");
    numero("valorTerreno");
    data("dataLancamento");
    data("dataInicioObras");
    data("dataPrevisaoTermino");
    data("dataHabiteSe");
    numero("percentualEntrada");
    numero("percentualObras");
    numero("percentualChaves");
    numero("orcamentoOriginal");
    numero("orcamentoAtual");
    numero("custoIncorrido");
    numero("custoAIncorrer");
    numero("percentualCronogramaFisico");
    numero("percentualCronogramaFinanceiro");
    return p;
  }

  async function salvar(completo: boolean) {
    setErroGeral(null);
    setSucesso(null);
    setErros({});

    const payload = montarPayload();
    const schema = completo ? FichaEmpreendimentoSchema : AtualizarFichaEmpreendimentoSchema;
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      setErros(errosPorCampo(parsed.error));
      setErroGeral("Corrija os campos destacados antes de continuar.");
      return;
    }

    setSalvando(true);
    try {
      await dossiesApi.atualizarFicha(dossie.dossieId, parsed.data);
      if (completo) {
        await concluirEtapa(1);
      } else {
        await recarregar();
        setSucesso("Rascunho salvo.");
      }
    } catch (err) {
      setErroGeral(err instanceof Error ? err.message : "Erro ao salvar a ficha");
    } finally {
      setSalvando(false);
    }
  }

  const checkboxCls = "w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500";

  return (
    <div className="space-y-8">
      {/* Métricas derivadas */}
      <div className="flex flex-wrap gap-3">
        <ChipCalculado rotulo="VGV" valor={fmtBRL(m?.vgv)} />
        <ChipCalculado rotulo="Valor médio do m²" valor={fmtBRL(m?.valorMedioM2)} />
        <ChipCalculado rotulo="% vendido" valor={fmtPct(m?.percentualVendido)} />
      </div>

      <Secao titulo="Projeto">
        <div className="grid md:grid-cols-2 gap-4">
          <Campo label="Nome do empreendimento" erro={erros["nomeEmpreendimento"]}>
            <input
              type="text"
              value={form.nomeEmpreendimento}
              onChange={(e) => set("nomeEmpreendimento", e.target.value)}
              disabled={readOnly || salvando}
              placeholder="Ex: Residencial Jardim das Acácias"
              className={inputCls}
            />
          </Campo>
          <Campo label="Razão social da SPE" erro={erros["speRazaoSocial"]}>
            <input
              type="text"
              value={form.speRazaoSocial}
              onChange={(e) => set("speRazaoSocial", e.target.value)}
              disabled={readOnly || salvando}
              placeholder="Acácias Empreendimentos SPE Ltda."
              className={inputCls}
            />
          </Campo>
          <Campo label="CNPJ da SPE" erro={erros["speCnpj"]}>
            <input
              type="text"
              inputMode="numeric"
              value={form.speCnpj}
              onChange={(e) => set("speCnpj", maskCNPJ(e.target.value))}
              disabled={readOnly || salvando}
              placeholder="00.000.000/0000-00"
              className={inputCls}
            />
          </Campo>
          <Campo label="Tipo de empreendimento" erro={erros["tipoEmpreendimento"]}>
            <select
              value={form.tipoEmpreendimento}
              onChange={(e) => set("tipoEmpreendimento", e.target.value)}
              disabled={readOnly || salvando}
              className={inputCls}
            >
              <option value="">Selecione...</option>
              {TipoEmpreendimentoEnum.options.map((t) => (
                <option key={t} value={t}>
                  {TIPO_EMPREENDIMENTO_LABEL[t] ?? t}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <div className="grid grid-cols-6 gap-4">
          <div className="col-span-6 md:col-span-3">
            <Campo label="Endereço" erro={erros["endereco"]}>
              <input
                type="text"
                value={form.endereco}
                onChange={(e) => set("endereco", e.target.value)}
                disabled={readOnly || salvando}
                placeholder="Rua, número, bairro"
                className={inputCls}
              />
            </Campo>
          </div>
          <div className="col-span-4 md:col-span-2">
            <Campo label="Cidade" erro={erros["cidade"]}>
              <input
                type="text"
                value={form.cidade}
                onChange={(e) => set("cidade", e.target.value)}
                disabled={readOnly || salvando}
                placeholder="São Paulo"
                className={inputCls}
              />
            </Campo>
          </div>
          <div className="col-span-2 md:col-span-1">
            <Campo label="UF" erro={erros["uf"]}>
              <input
                type="text"
                value={form.uf}
                onChange={(e) => set("uf", e.target.value.toUpperCase().slice(0, 2))}
                disabled={readOnly || salvando}
                placeholder="SP"
                maxLength={2}
                className={inputCls}
              />
            </Campo>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <Campo label="Área do terreno (m²)" erro={erros["areaTerrenoM2"]}>
            <input
              type="text"
              inputMode="decimal"
              value={form.areaTerrenoM2}
              onChange={(e) => set("areaTerrenoM2", e.target.value)}
              disabled={readOnly || salvando}
              placeholder="1.500,00"
              className={inputCls}
            />
          </Campo>
          <Campo label="Área construída (m²)" erro={erros["areaConstruidaM2"]}>
            <input
              type="text"
              inputMode="decimal"
              value={form.areaConstruidaM2}
              onChange={(e) => set("areaConstruidaM2", e.target.value)}
              disabled={readOnly || salvando}
              placeholder="8.200,00"
              className={inputCls}
            />
          </Campo>
          <Campo label="Área privativa total (m²)" erro={erros["areaPrivativaTotalM2"]}>
            <input
              type="text"
              inputMode="decimal"
              value={form.areaPrivativaTotalM2}
              onChange={(e) => set("areaPrivativaTotalM2", e.target.value)}
              disabled={readOnly || salvando}
              placeholder="6.400,00"
              className={inputCls}
            />
          </Campo>
          <Campo label="Valor do terreno (R$)" erro={erros["valorTerreno"]}>
            <input
              type="text"
              inputMode="decimal"
              value={form.valorTerreno}
              onChange={(e) => set("valorTerreno", e.target.value)}
              disabled={readOnly || salvando}
              placeholder="2.500.000,00"
              className={inputCls}
            />
          </Campo>
        </div>

        <label className="flex items-center gap-2.5 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.patrimonioAfetacao}
            onChange={(e) => set("patrimonioAfetacao", e.target.checked)}
            disabled={readOnly || salvando}
            className={checkboxCls}
          />
          Empreendimento com patrimônio de afetação
        </label>
      </Secao>

      <Secao titulo="Datas">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Campo label="Lançamento" opcional erro={erros["dataLancamento"]}>
            <input
              type="date"
              value={form.dataLancamento}
              onChange={(e) => set("dataLancamento", e.target.value)}
              disabled={readOnly || salvando}
              className={inputCls}
            />
          </Campo>
          <Campo label="Início das obras" opcional erro={erros["dataInicioObras"]}>
            <input
              type="date"
              value={form.dataInicioObras}
              onChange={(e) => set("dataInicioObras", e.target.value)}
              disabled={readOnly || salvando}
              className={inputCls}
            />
          </Campo>
          <Campo label="Previsão de término" opcional erro={erros["dataPrevisaoTermino"]}>
            <input
              type="date"
              value={form.dataPrevisaoTermino}
              onChange={(e) => set("dataPrevisaoTermino", e.target.value)}
              disabled={readOnly || salvando}
              className={inputCls}
            />
          </Campo>
          <Campo label="Habite-se" opcional erro={erros["dataHabiteSe"]}>
            <input
              type="date"
              value={form.dataHabiteSe}
              onChange={(e) => set("dataHabiteSe", e.target.value)}
              disabled={readOnly || salvando}
              className={inputCls}
            />
          </Campo>
        </div>
      </Secao>

      <Secao titulo="Alienação & Seguro">
        <div className="grid md:grid-cols-3 gap-3">
          <label className="flex items-center gap-2.5 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.alienacaoFiduciariaTerreno}
              onChange={(e) => set("alienacaoFiduciariaTerreno", e.target.checked)}
              disabled={readOnly || salvando}
              className={checkboxCls}
            />
            Alienação fiduciária do terreno
          </label>
          <label className="flex items-center gap-2.5 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.alienacaoFiduciariaUnidades}
              onChange={(e) => set("alienacaoFiduciariaUnidades", e.target.checked)}
              disabled={readOnly || salvando}
              className={checkboxCls}
            />
            Alienação fiduciária das unidades
          </label>
          <label className="flex items-center gap-2.5 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.seguroObra}
              onChange={(e) => set("seguroObra", e.target.checked)}
              disabled={readOnly || salvando}
              className={checkboxCls}
            />
            Seguro de obra contratado
          </label>
        </div>
      </Secao>

      <Secao titulo="Recebimento">
        <p className="text-xs text-gray-400 -mt-2">
          Distribuição percentual do fluxo de recebimento das vendas.
        </p>
        <div className="grid grid-cols-3 gap-4">
          <Campo label="% Entrada" erro={erros["percentualEntrada"]}>
            <input
              type="text"
              inputMode="decimal"
              value={form.percentualEntrada}
              onChange={(e) => set("percentualEntrada", e.target.value)}
              disabled={readOnly || salvando}
              placeholder="20"
              className={inputCls}
            />
          </Campo>
          <Campo label="% Durante obras" erro={erros["percentualObras"]}>
            <input
              type="text"
              inputMode="decimal"
              value={form.percentualObras}
              onChange={(e) => set("percentualObras", e.target.value)}
              disabled={readOnly || salvando}
              placeholder="30"
              className={inputCls}
            />
          </Campo>
          <Campo label="% Chaves" erro={erros["percentualChaves"]}>
            <input
              type="text"
              inputMode="decimal"
              value={form.percentualChaves}
              onChange={(e) => set("percentualChaves", e.target.value)}
              disabled={readOnly || salvando}
              placeholder="50"
              className={inputCls}
            />
          </Campo>
        </div>
      </Secao>

      <Secao titulo="Obras — orçamento">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Campo label="Orçamento original (R$)" erro={erros["orcamentoOriginal"]}>
            <input
              type="text"
              inputMode="decimal"
              value={form.orcamentoOriginal}
              onChange={(e) => set("orcamentoOriginal", e.target.value)}
              disabled={readOnly || salvando}
              placeholder="10.000.000,00"
              className={inputCls}
            />
          </Campo>
          <Campo label="Orçamento atual (R$)" erro={erros["orcamentoAtual"]}>
            <input
              type="text"
              inputMode="decimal"
              value={form.orcamentoAtual}
              onChange={(e) => set("orcamentoAtual", e.target.value)}
              disabled={readOnly || salvando}
              placeholder="10.500.000,00"
              className={inputCls}
            />
          </Campo>
          <Campo label="Custo incorrido (R$)" erro={erros["custoIncorrido"]}>
            <input
              type="text"
              inputMode="decimal"
              value={form.custoIncorrido}
              onChange={(e) => set("custoIncorrido", e.target.value)}
              disabled={readOnly || salvando}
              placeholder="4.200.000,00"
              className={inputCls}
            />
          </Campo>
          <Campo label="Custo a incorrer (R$)" erro={erros["custoAIncorrer"]}>
            <input
              type="text"
              inputMode="decimal"
              value={form.custoAIncorrer}
              onChange={(e) => set("custoAIncorrer", e.target.value)}
              disabled={readOnly || salvando}
              placeholder="6.300.000,00"
              className={inputCls}
            />
          </Campo>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Campo label="% Cronograma físico realizado" erro={erros["percentualCronogramaFisico"]}>
            <input
              type="text"
              inputMode="decimal"
              value={form.percentualCronogramaFisico}
              onChange={(e) => set("percentualCronogramaFisico", e.target.value)}
              disabled={readOnly || salvando}
              placeholder="40"
              className={inputCls}
            />
          </Campo>
          <Campo
            label="% Cronograma financeiro realizado"
            erro={erros["percentualCronogramaFinanceiro"]}
          >
            <input
              type="text"
              inputMode="decimal"
              value={form.percentualCronogramaFinanceiro}
              onChange={(e) => set("percentualCronogramaFinanceiro", e.target.value)}
              disabled={readOnly || salvando}
              placeholder="38"
              className={inputCls}
            />
          </Campo>
        </div>
      </Secao>

      {erroGeral && <BannerErro>{erroGeral}</BannerErro>}
      {sucesso && <BannerOk>{sucesso}</BannerOk>}

      <AcoesEtapa
        readOnly={readOnly}
        salvando={salvando}
        concluida={dossie.etapasConcluidas.includes(1)}
        onSalvar={() => void salvar(false)}
        onConcluir={() => void salvar(true)}
      />
    </div>
  );
}

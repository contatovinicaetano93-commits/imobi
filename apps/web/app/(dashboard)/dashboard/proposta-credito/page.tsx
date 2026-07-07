"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  dossiesApi,
  type ChecklistTemplateResponse,
  type DossieDetalhe,
  type DossieResumo,
  type EstagioObraDossie,
} from "@/lib/api";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  Building2,
  Loader2,
  Upload,
  Paperclip,
} from "lucide-react";
import { PageSkeleton } from "@/app/(dashboard)/_components/PageSkeleton";
import { useToast } from "@/hooks/toast-context";
import { PanelSection } from "@/components/dashboard/PanelSection";
import { DashboardPanelShell } from "@/components/dashboard/DashboardPanelShell";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  RASCUNHO: { label: "Rascunho", cls: "bg-gray-100 text-gray-700" },
  ENVIADO: { label: "Enviado", cls: "bg-blue-100 text-blue-800" },
  EM_ANALISE: { label: "Em análise", cls: "bg-amber-100 text-amber-800" },
  APROVADO: { label: "Aprovado", cls: "bg-green-100 text-green-800" },
  REPROVADO: { label: "Reprovado", cls: "bg-red-100 text-red-800" },
};

const ITEM_BADGE: Record<string, string> = {
  PENDENTE: "bg-yellow-100 text-yellow-800",
  ENVIADO: "bg-blue-100 text-blue-800",
  APROVADO: "bg-green-100 text-green-800",
  REPROVADO: "bg-red-100 text-red-800",
  NA: "bg-gray-100 text-gray-600",
};

function validarPercentualFisico(
  estagio: EstagioObraDossie,
  value: string | number | null | undefined,
  template: ChecklistTemplateResponse | null,
): string | null {
  if (estagio === "NOVO") return null;

  const raw = value === null || value === undefined ? "" : String(value).trim();
  if (raw === "") {
    return "Informe o percentual físico da obra.";
  }

  const pct = Number(raw);
  if (Number.isNaN(pct)) {
    return "Informe o percentual físico da obra (número válido).";
  }

  const meta = template?.estagiosDisponiveis?.find((e) => e.id === estagio);
  const min = meta?.percentualObraMin ?? 1;
  const max = meta?.percentualObraMax ?? 99;
  if (pct < min || pct > max) {
    return `Percentual físico deve estar entre ${min}% e ${max}%.`;
  }

  return null;
}

export default function ViabilidadePage() {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lista, setLista] = useState<DossieResumo[]>([]);
  const [dossie, setDossie] = useState<DossieDetalhe | null>(null);
  const [template, setTemplate] = useState<ChecklistTemplateResponse | null>(null);
  const [criando, setCriando] = useState(false);
  const [estagio, setEstagio] = useState<EstagioObraDossie>("NOVO");
  const [nome, setNome] = useState("");
  const [percentual, setPercentual] = useState("");
  const [dataBase, setDataBase] = useState("");
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadItemId = useRef<string | null>(null);

  const carregar = useCallback(async () => {
    setError(null);
    try {
      const items = await dossiesApi.listar();
      setLista(items);
      const ativo =
        items.find((d) => d.status === "RASCUNHO") ??
        items.find((d) => ["ENVIADO", "EM_ANALISE", "REPROVADO"].includes(d.status)) ??
        items.find((d) => d.status === "APROVADO");
      if (ativo) {
        const detalhe = await dossiesApi.buscar(ativo.id);
        setDossie(detalhe);
        if (detalhe.estagioObra) {
          const tpl = await dossiesApi.checklistTemplate(detalhe.estagioObra);
          setTemplate(tpl);
        }
      } else {
        setDossie(null);
        const tpl = await dossiesApi.checklistTemplate("NOVO");
        setTemplate(tpl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dossiê");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const handleEstagioChange = async (novo: EstagioObraDossie) => {
    setEstagio(novo);
    try {
      const tpl = await dossiesApi.checklistTemplate(novo);
      setTemplate(tpl);
    } catch {
      /* ignore */
    }
  };

  const handleCriar = async () => {
    if (nome.trim().length < 3) {
      toastError("Informe o nome do empreendimento (mín. 3 caracteres).");
      return;
    }

    const pctErro = validarPercentualFisico(estagio, percentual, template);
    if (pctErro) {
      toastError(pctErro);
      return;
    }

    setCriando(true);
    setError(null);
    try {
      const payload: Parameters<typeof dossiesApi.criar>[0] = {
        estagioObra: estagio,
        nomeEmpreendimento: nome.trim(),
      };
      if (estagio !== "NOVO") {
        payload.percentualFisico = Number(percentual.trim());
      }
      if (dataBase) payload.dataBase = dataBase;

      await dossiesApi.criar(payload);
      success("Dossiê criado. Complete o checklist e envie para análise.");
      setNome("");
      setPercentual("");
      setDataBase("");
      await carregar();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar dossiê";
      setError(msg);
      toastError(msg);
    } finally {
      setCriando(false);
    }
  };

  const handleMarcarItem = async (itemId: string, status: "ENVIADO" | "NA") => {
    if (!dossie || dossie.status !== "RASCUNHO") return;
    setSaving(true);
    try {
      const atualizado = await dossiesApi.atualizar(dossie.id, {
        checklistItens: [{ itemId, status }],
      });
      setDossie(atualizado);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro ao atualizar item");
    } finally {
      setSaving(false);
    }
  };

  const handleAnexarClick = (itemId: string) => {
    pendingUploadItemId.current = itemId;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const itemId = pendingUploadItemId.current;
    e.target.value = "";
    pendingUploadItemId.current = null;
    if (!file || !itemId || !dossie || dossie.status !== "RASCUNHO") return;

    setUploadingItemId(itemId);
    try {
      const fd = new FormData();
      fd.append("arquivo", file);
      fd.append("tipo", "OUTROS");
      fd.append("nome", file.name);
      fd.append("descricao", `Dossiê viabilidade — item ${itemId}`);

      const res = await fetch("/api/proxy/documentos", { method: "POST", body: fd });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Erro ao enviar arquivo.");
      }
      const doc = (await res.json()) as { documentoId: string };

      const atualizado = await dossiesApi.atualizar(dossie.id, {
        checklistItens: [{ itemId, status: "ENVIADO", documentoId: doc.documentoId }],
      });
      setDossie(atualizado);
      success("Documento anexado ao checklist.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro ao anexar documento");
    } finally {
      setUploadingItemId(null);
    }
  };

  const handleSalvarCampos = async () => {
    if (!dossie || dossie.status !== "RASCUNHO") return;

    if (dossie.estagioObra && dossie.estagioObra !== "NOVO") {
      const pctErro = validarPercentualFisico(
        dossie.estagioObra,
        dossie.percentualFisico ?? percentual,
        template,
      );
      if (pctErro) {
        toastError(pctErro);
        return;
      }
    }

    setSaving(true);
    try {
      const atualizado = await dossiesApi.atualizar(dossie.id, {
        nomeEmpreendimento: dossie.nomeEmpreendimento,
        percentualFisico:
          dossie.estagioObra === "NOVO"
            ? 0
            : dossie.percentualFisico ?? (percentual.trim() ? Number(percentual.trim()) : null),
        dataBase: (dossie.dataBase?.slice(0, 10) ?? dataBase) || null,
      });
      setDossie(atualizado);
      success("Dados salvos.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleEnviar = async () => {
    if (!dossie) return;

    if (dossie.estagioObra && dossie.estagioObra !== "NOVO") {
      const pctErro = validarPercentualFisico(
        dossie.estagioObra,
        dossie.percentualFisico,
        template,
      );
      if (pctErro) {
        toastError(pctErro);
        return;
      }
    }

    setSaving(true);
    try {
      await dossiesApi.enviar(dossie.id);
      success("Dossiê enviado para análise do time IMOBI.");
      await carregar();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Checklist incompleto ou dados faltando");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl">
        <PageSkeleton variant="cards" count={3} />
      </div>
    );
  }

  const editavel = dossie?.status === "RASCUNHO";
  const itens = dossie?.checklistItens ?? [];
  const obrigatorios = itens.filter((i) => i.obrigatorio);
  const concluidos = obrigatorios.filter((i) =>
    ["ENVIADO", "APROVADO", "NA"].includes(i.status),
  );
  const pct =
    obrigatorios.length > 0
      ? Math.round((concluidos.length / obrigatorios.length) * 100)
      : 0;

  const viabilidadePanels = !dossie
    ? [{ id: "viabilidade-novo", priority: "primary" as const }]
    : [
        { id: "viabilidade-status", priority: "primary" as const },
        { id: "viabilidade-checklist", priority: "primary" as const },
      ];

  return (
    <DashboardPanelShell
      panels={viabilidadePanels}
      maxWidth="md"
      content={
        <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.xlsx,.xls,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => void handleFileSelected(e)}
      />
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Dossiê de viabilidade
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Checklist de crédito e Ficha do Empreendimento — etapa obrigatória antes de cadastrar a obra.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <p className="flex-1 text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => void carregar()}
            className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!dossie && template && (
        <PanelSection
          id="viabilidade-novo"
          title="Novo dossiê"
          icon={<FileText className="w-4 h-4 text-[#1B4FD8]" />}
          priority="primary"
          summary="Selecione o estágio e cadastre o empreendimento"
        >
        <div className="space-y-5">
          <p className="text-sm text-gray-500">Selecione o estágio do empreendimento:</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {(template.estagiosDisponiveis ?? []).map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => handleEstagioChange(e.id)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  estagio === e.id
                    ? "border-[#1B4FD8] bg-[#EEF3FF]"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <p className="text-sm font-semibold text-gray-900">{e.label}</p>
                <p className="mt-1 text-xs text-gray-500 line-clamp-3">{e.descricao}</p>
              </button>
            ))}
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Nome do empreendimento
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="Ex.: Residencial Parque Verde"
              />
            </label>
            {estagio !== "NOVO" && (
              <label className="block text-sm font-medium text-gray-700">
                Percentual físico da obra (%)
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={percentual}
                  onChange={(e) => setPercentual(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </label>
            )}
            <label className="block text-sm font-medium text-gray-700">
              Data-base do dossiê
              <input
                type="date"
                value={dataBase}
                onChange={(e) => setDataBase(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={criando}
            onClick={() => void handleCriar()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1B4FD8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {criando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Criar dossiê
          </button>
        </div>
        </PanelSection>
      )}

      {dossie && (
        <>
          <PanelSection
            id="viabilidade-status"
            title={dossie.nomeEmpreendimento}
            icon={<Building2 className="w-4 h-4 text-[#1B4FD8]" />}
            priority="primary"
            summary={`${STATUS_BADGE[dossie.status]?.label ?? dossie.status} · ${pct}% do checklist`}
            badge={pct < 100 ? `${pct}%` : undefined}
          >
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
            <div className="border-b border-gray-50 bg-[#EEF3FF] px-6 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#1B4FD8]">
                    {dossie.estagioObra?.replace(/_/g, " ") ?? "Dossiê"}
                  </p>
                  <h2 className="text-lg font-bold text-[#0C1A3D]">{dossie.nomeEmpreendimento}</h2>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    STATUS_BADGE[dossie.status]?.cls ?? "bg-gray-100"
                  }`}
                >
                  {STATUS_BADGE[dossie.status]?.label ?? dossie.status}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
                <div
                  className="h-full rounded-full bg-[#4ADE80] transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-gray-600">
                {concluidos.length}/{obrigatorios.length} itens obrigatórios marcados
              </p>
            </div>
            {dossie.observacaoAdmin && (
              <div className="border-b border-amber-100 bg-amber-50 px-6 py-3 text-sm text-amber-800">
                Observação do analista: {dossie.observacaoAdmin}
              </div>
            )}
          </div>
          </PanelSection>

          <PanelSection
            id="viabilidade-checklist"
            title="Checklist de documentos"
            icon={<Building2 className="w-4 h-4 text-[#1B4FD8]" />}
            priority="primary"
            summary={`${concluidos.length}/${obrigatorios.length} itens obrigatórios`}
          >
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
            <div className="divide-y divide-gray-50">
              {itens.map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {item.itemId}. {item.titulo}
                      {!item.obrigatorio && (
                        <span className="ml-2 text-xs text-gray-400">(opcional)</span>
                      )}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      ITEM_BADGE[item.status] ?? "bg-gray-100"
                    }`}
                  >
                    {item.status}
                  </span>
                  {editavel && item.status === "PENDENTE" && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        disabled={saving || uploadingItemId === item.itemId}
                        onClick={() => handleAnexarClick(item.itemId)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#1B4FD8] px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                      >
                        {uploadingItemId === item.itemId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Upload className="h-3 w-3" />
                        )}
                        Anexar
                      </button>
                      <button
                        type="button"
                        disabled={saving || uploadingItemId !== null}
                        onClick={() => void handleMarcarItem(item.itemId, "ENVIADO")}
                        className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Marcar enviado
                      </button>
                      {!item.obrigatorio && (
                        <button
                          type="button"
                          disabled={saving || uploadingItemId !== null}
                          onClick={() => void handleMarcarItem(item.itemId, "NA")}
                          className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                          N/A
                        </button>
                      )}
                    </div>
                  )}
                  {item.documentoId && item.status !== "PENDENTE" && (
                    <a
                      href={`/api/proxy/documentos/${item.documentoId}/arquivo`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#1B4FD8] hover:underline"
                    >
                      <Paperclip className="h-3 w-3" />
                      Ver anexo
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {editavel && (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSalvarCampos()}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Salvar rascunho
              </button>
              <button
                type="button"
                disabled={saving || pct < 100}
                onClick={() => void handleEnviar()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1B4FD8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Enviar para análise
              </button>
            </div>
          )}

          {dossie.status === "APROVADO" && (
            <div className="flex flex-col gap-3 rounded-2xl border border-green-200 bg-green-50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                <p className="text-sm text-green-800">
                  Dossiê aprovado. Cadastre sua obra no próximo passo do fluxo.
                </p>
              </div>
              <Link
                href="/dashboard/obras/nova"
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                Cadastrar obra
              </Link>
            </div>
          )}

          {(dossie.status === "ENVIADO" || dossie.status === "EM_ANALISE") && (
            <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <Clock className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-blue-800">
                Seu dossiê está em análise. Você será notificado quando concluído.
              </p>
            </div>
          )}
          </PanelSection>
        </>
      )}

      {lista.length > 1 && (
        <p className="text-xs text-gray-400">
          {lista.length} dossiê(s) no histórico — exibindo o mais recente em andamento.
        </p>
      )}

      <div className="rounded-2xl border border-blue-100 bg-[#EEF3FF] p-5">
        <p className="mb-2 text-sm font-semibold text-[#1B4FD8]">Como funciona</p>
        <ul className="space-y-1.5 text-sm text-gray-600">
          <li>· Escolha o estágio (novo, em andamento ou entrada tardia)</li>
          <li>· Anexe PDF ou planilha em cada item ou marque como enviado se já tiver no arquivo</li>
          <li>· Aprovação libera o cadastro da obra na jornada</li>
        </ul>
      </div>
        </>
      }
    />
  );
}

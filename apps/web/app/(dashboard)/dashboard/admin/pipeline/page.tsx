"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  MapPin,
  Building2,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  Plus,
  Trash2,
  X,
  ArrowLeft,
  Upload,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import {
  pipelineApi,
  type PipelineEtapa,
  type PipelineItem,
} from "@/lib/api";
import { useAdminFilasOnChange } from "@/hooks/use-admin-filas-poll";
import { useToast } from "@/hooks/toast-context";

const NAVY = "#0C1A3D";
const ROYAL = "#1B4FD8";

const ETAPAS: { key: PipelineEtapa; label: string; color: string; bg: string }[] = [
  { key: "prospeccao", label: "Prospecção", color: "#6b7280", bg: "#f3f4f6" },
  { key: "analise", label: "Em Análise", color: "#d97706", bg: "#fffbeb" },
  { key: "estruturacao", label: "Estruturação", color: ROYAL, bg: "#eff6ff" },
  { key: "aprovado", label: "Aprovado", color: "#16a34a", bg: "#f0fdf4" },
  { key: "standby", label: "Standby", color: "#9333ea", bg: "#faf5ff" },
];

const ETAPA_ICON: Record<PipelineEtapa, typeof Clock> = {
  prospeccao: Clock,
  analise: AlertCircle,
  estruturacao: TrendingUp,
  aprovado: CheckCircle2,
  standby: Clock,
};

const jost = { fontFamily: "'Jost', sans-serif" } as const;
const inp = {
  fontFamily: "'Jost', sans-serif",
  width: "100%",
  padding: "0.55rem 0.85rem",
  border: "1px solid rgba(12,26,61,0.14)",
  borderRadius: 8,
  fontSize: "0.82rem",
  color: NAVY,
  outline: "none",
  background: "white",
} as const;

type NovaOp = {
  nome: string;
  local: string;
  tipo: string;
  valor: string;
  etapa: PipelineEtapa;
  notas: string;
  contato: string;
  email: string;
  telefone: string;
};

const OP_VAZIA: NovaOp = {
  nome: "",
  local: "",
  tipo: "Crédito Ponte",
  valor: "",
  etapa: "prospeccao",
  notas: "",
  contato: "",
  email: "",
  telefone: "",
};

function parseValorBRL(raw: string): number | undefined {
  const n = Number(raw.replace(/[^\d]/g, ""));
  return n > 0 ? n : undefined;
}

function mapStage(stage: string): PipelineEtapa {
  const s = stage.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (s.includes("aprovado") || s.includes("fechamento")) return "aprovado";
  if (s.includes("negociacao") || s.includes("proposta") || s.includes("qualificacao") || s.includes("analise")) {
    return "analise";
  }
  if (s.includes("estruturacao")) return "estruturacao";
  if (s.includes("standby")) return "standby";
  return "prospeccao";
}

function parseCSV(text: string): Omit<NovaOp, "email" | "telefone">[] {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  const idx = (key: string) => headers.indexOf(key);

  return lines.slice(1).map((line, i) => {
    const cols: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') {
        inQuote = !inQuote;
        continue;
      }
      if (ch === "," && !inQuote) {
        cols.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    cols.push(cur.trim());

    const get = (key: string) => cols[idx(key)]?.trim() || "";
    const nome = get("clientenome") || get("nome") || `Operação ${i + 1}`;
    const stageRaw = get("stage") || get("etapa") || "prospeccao";

    return {
      nome,
      local: get("local") || "",
      tipo: get("tipoobra") || get("tipo") || "Crédito Ponte",
      valor: get("volume") || get("valor"),
      etapa: mapStage(stageRaw),
      notas: get("observacoes") || get("notas"),
      contato: get("contato") || get("clientetelefone"),
    };
  });
}

function LeadCard({
  lead,
  onEtapaChange,
  onDelete,
  moving,
}: {
  lead: PipelineItem;
  onEtapaChange: (lead: PipelineItem, e: PipelineEtapa) => void;
  onDelete: (lead: PipelineItem) => void;
  moving: boolean;
}) {
  const etapa = ETAPAS.find((e) => e.key === lead.etapa)!;
  const Icon = ETAPA_ICON[lead.etapa];
  const [confirmando, setConfirmando] = useState(false);

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        opacity: moving ? 0.6 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontWeight: 700,
              fontSize: "0.95rem",
              color: NAVY,
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {lead.nome}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
            <MapPin size={11} color="#9ca3af" />
            <p style={{ fontSize: "0.72rem", color: "#6b7280", margin: 0 }}>
              {lead.local ?? "—"}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span
            style={{
              fontSize: "0.62rem",
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 6,
              background: lead.fonte === "solicitacao" ? "#eff6ff" : "#f3f4f6",
              color: lead.fonte === "solicitacao" ? ROYAL : "#6b7280",
            }}
          >
            {lead.fonte === "solicitacao" ? "Comitê" : "Proposta"}
          </span>
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 600,
              padding: "3px 8px",
              borderRadius: 20,
              background: etapa.bg,
              color: etapa.color,
              display: "flex",
              alignItems: "center",
              gap: 4,
              whiteSpace: "nowrap",
            }}
          >
            <Icon size={10} />
            {etapa.label}
          </span>
          <button
            onClick={() => setConfirmando(true)}
            title="Arquivar"
            style={{
              background: "none",
              border: "1px solid #fecaca",
              borderRadius: 6,
              cursor: "pointer",
              color: "#ef4444",
              padding: "10px 10px",
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {confirmando && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 10,
            padding: "0.75rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <p style={{ ...jost, fontSize: "0.78rem", fontWeight: 600, color: "#dc2626", margin: 0 }}>
            Arquivar esta operação?
          </p>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => {
                onDelete(lead);
                setConfirmando(false);
              }}
              style={{
                ...jost,
                flex: 1,
                fontSize: "0.78rem",
                fontWeight: 700,
                background: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "0.45rem 0",
                cursor: "pointer",
              }}
            >
              Sim, arquivar
            </button>
            <button
              onClick={() => setConfirmando(false)}
              style={{
                ...jost,
                flex: 1,
                fontSize: "0.78rem",
                fontWeight: 600,
                background: "white",
                color: "#6b7280",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "0.45rem 0",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        <div style={{ background: "#f9fafb", borderRadius: 8, padding: "0.5rem 0.6rem" }}>
          <p style={{ fontSize: "0.62rem", color: "#9ca3af", margin: 0 }}>Tipo</p>
          <p style={{ fontSize: "0.78rem", fontWeight: 600, color: NAVY, margin: 0 }}>{lead.tipo}</p>
        </div>
        <div style={{ background: "#f9fafb", borderRadius: 8, padding: "0.5rem 0.6rem" }}>
          <p style={{ fontSize: "0.62rem", color: "#9ca3af", margin: 0 }}>Valor</p>
          <p style={{ fontSize: "0.78rem", fontWeight: 600, color: NAVY, margin: 0 }}>
            {lead.valorFormatado ?? "A definir"}
          </p>
        </div>
        <div style={{ background: "#f9fafb", borderRadius: 8, padding: "0.5rem 0.6rem" }}>
          <p style={{ fontSize: "0.62rem", color: "#9ca3af", margin: 0 }}>Contato</p>
          <p style={{ fontSize: "0.78rem", fontWeight: 600, color: NAVY, margin: 0 }}>{lead.contato}</p>
        </div>
        <div style={{ background: "#f9fafb", borderRadius: 8, padding: "0.5rem 0.6rem" }}>
          <p style={{ fontSize: "0.62rem", color: "#9ca3af", margin: 0 }}>Status API</p>
          <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6b7280", margin: 0 }}>{lead.statusOperacional}</p>
        </div>
      </div>

      {lead.notas && (
        <p
          style={{
            fontSize: "0.72rem",
            color: "#6b7280",
            background: "#f9fafb",
            borderRadius: 8,
            padding: "0.5rem 0.6rem",
            margin: 0,
            maxHeight: 80,
            overflow: "hidden",
          }}
        >
          {lead.notas}
        </p>
      )}

      <Link
        href={lead.href as Route}
        style={{
          ...jost,
          fontSize: "0.72rem",
          fontWeight: 600,
          color: ROYAL,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          textDecoration: "none",
        }}
      >
        Abrir no fluxo operacional
        <ExternalLink size={12} />
      </Link>

      <div>
        <p style={{ fontSize: "0.62rem", color: "#9ca3af", marginBottom: 4 }}>Mover para</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {ETAPAS.map((e) => (
            <button
              key={e.key}
              disabled={moving || lead.etapa === e.key}
              onClick={() => onEtapaChange(lead, e.key)}
              style={{
                fontSize: "0.65rem",
                fontWeight: 600,
                padding: "8px 10px",
                borderRadius: 20,
                border: `1px solid ${lead.etapa === e.key ? e.color : "#e5e7eb"}`,
                background: lead.etapa === e.key ? e.bg : "white",
                color: lead.etapa === e.key ? e.color : "#9ca3af",
                cursor: lead.etapa === e.key || moving ? "default" : "pointer",
              }}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const toastErrorRef = useRef(toastError);
  toastErrorRef.current = toastError;
  const [leads, setLeads] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<PipelineEtapa | "todos">("todos");
  const [showForm, setShowForm] = useState(false);
  const [novaOp, setNovaOp] = useState<NovaOp>(OP_VAZIA);
  const [csvMsg, setCsvMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    try {
      const { items } = await pipelineApi.listar();
      setLeads(items);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useAdminFilasOnChange(carregar);

  const moveEtapa = async (lead: PipelineItem, etapa: PipelineEtapa) => {
    setMovingId(`${lead.fonte}:${lead.id}`);
    try {
      const updated = await pipelineApi.atualizarEtapa(lead.fonte, lead.id, etapa);
      setLeads((prev) =>
        prev.map((l) => (l.fonte === lead.fonte && l.id === lead.id ? updated : l)),
      );
      success("Etapa atualizada.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro ao mover etapa");
    } finally {
      setMovingId(null);
    }
  };

  const deleteLead = async (lead: PipelineItem) => {
    try {
      await pipelineApi.excluir(lead.fonte, lead.id);
      setLeads((prev) => prev.filter((l) => !(l.fonte === lead.fonte && l.id === lead.id)));
      success("Operação arquivada.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro ao arquivar");
    }
  };

  const addLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaOp.nome.trim() || !novaOp.email.trim()) return;
    try {
      const created = await pipelineApi.criarLead({
        nomeEmpreendimento: novaOp.nome.trim(),
        nomeContato: novaOp.contato.trim() || novaOp.nome.trim(),
        email: novaOp.email.trim(),
        telefone: novaOp.telefone.trim() || undefined,
        local: novaOp.local.trim() || undefined,
        valorEstimado: parseValorBRL(novaOp.valor),
        notas: novaOp.notas.trim() || undefined,
        contato: novaOp.contato.trim() || undefined,
        etapa: novaOp.etapa,
      });
      setLeads((prev) => [created, ...prev]);
      setNovaOp(OP_VAZIA);
      setShowForm(false);
      success("Operação criada e sincronizada com propostas.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro ao criar operação");
    }
  };

  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const imported = parseCSV(text);
        if (imported.length === 0) {
          setCsvMsg("Nenhuma operação encontrada no CSV.");
          return;
        }
        let count = 0;
        for (const row of imported) {
          await pipelineApi.criarLead({
            nomeEmpreendimento: row.nome,
            nomeContato: row.contato || row.nome,
            email: `pipeline+${Date.now()}-${count}@imobi.local`,
            local: row.local || undefined,
            valorEstimado: parseValorBRL(row.valor),
            notas: row.notas || undefined,
            etapa: row.etapa,
          });
          count += 1;
        }
        await carregar();
        setCsvMsg(`${count} operação(ões) importada(s) como propostas.`);
        setTimeout(() => setCsvMsg(null), 4000);
      } catch {
        setCsvMsg("Erro ao importar CSV.");
      }
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const visiveis = filtro === "todos" ? leads : leads.filter((l) => l.etapa === filtro);
  const totalValor = leads.reduce((acc, l) => acc + (l.valor ?? 0), 0);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 0 3rem" }}>
      <button
        onClick={() => router.push("/dashboard/admin")}
        style={{
          ...jost,
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#6b7280",
          fontSize: "0.82rem",
          fontWeight: 500,
          padding: "0.4rem 0",
          marginBottom: "1rem",
        }}
      >
        <ArrowLeft size={15} /> Voltar
      </button>

      <div
        style={{
          background: "#eff6ff",
          border: "1px solid #c7d7fa",
          borderRadius: 12,
          padding: "0.85rem 1rem",
          marginBottom: "1.25rem",
        }}
      >
        <p style={{ ...jost, fontSize: "0.78rem", color: ROYAL, fontWeight: 600, margin: 0 }}>
          Conectado à arquitetura Imobi
        </p>
        <p style={{ ...jost, fontSize: "0.72rem", color: "#4b6cb7", margin: "4px 0 0" }}>
          Cards vêm de <strong>PropostaCredito</strong> (/envie-seu-projeto + leads manuais) e{" "}
          <strong>SolicitacaoCredito</strong> (comitê). Mover etapa atualiza status no banco; filas Admin
          sincronizam a cada 20s.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ ...jost, fontSize: "1.4rem", fontWeight: 700, color: NAVY, margin: 0 }}>
            Pipeline de Operações
          </h1>
          <p style={{ ...jost, fontSize: "0.8rem", color: "#6b7280", margin: "4px 0 0" }}>
            {loading ? "Carregando…" : `${leads.length} operações`}
            {totalValor > 0 && (
              <>
                {" "}
                · Potencial com valor:{" "}
                <strong style={{ color: ROYAL }}>
                  {totalValor.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  })}
                </strong>
              </>
            )}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => void carregar()}
            style={{
              ...jost,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.8rem",
              fontWeight: 600,
              padding: "0.5rem 0.9rem",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "white",
              color: NAVY,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={13} /> Atualizar
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Filter size={13} color="#9ca3af" />
            {[{ key: "todos" as const, label: "Todos" }, ...ETAPAS].map((e) => {
              const active = filtro === e.key;
              const etapaInfo = ETAPAS.find((x) => x.key === e.key);
              return (
                <button
                  key={e.key}
                  onClick={() => setFiltro(e.key)}
                  style={{
                    ...jost,
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    padding: "10px 12px",
                    borderRadius: 20,
                    border: `1px solid ${active ? (etapaInfo?.color ?? ROYAL) : "#e5e7eb"}`,
                    background: active ? (etapaInfo?.bg ?? "#eff6ff") : "white",
                    color: active ? (etapaInfo?.color ?? ROYAL) : "#6b7280",
                    cursor: "pointer",
                  }}
                >
                  {e.label}
                  {e.key !== "todos" && (
                    <span style={{ marginLeft: 4, opacity: 0.6 }}>
                      {leads.filter((l) => l.etapa === e.key).length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleCSV} />
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              ...jost,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.8rem",
              fontWeight: 600,
              padding: "0.5rem 1.1rem",
              borderRadius: 10,
              border: "1px solid rgba(12,26,61,0.2)",
              background: "white",
              color: NAVY,
              cursor: "pointer",
            }}
          >
            <Upload size={13} /> Importar CSV
          </button>

          <button
            onClick={() => setShowForm((s) => !s)}
            style={{
              ...jost,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.8rem",
              fontWeight: 700,
              padding: "0.5rem 1.1rem",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              background: showForm ? "rgba(12,26,61,0.6)" : NAVY,
              color: "white",
            }}
          >
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {showForm ? "Cancelar" : "Nova operação"}
          </button>
        </div>
      </div>

      {csvMsg && (
        <div
          style={{
            background: csvMsg.includes("importada") ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${csvMsg.includes("importada") ? "#bbf7d0" : "#fecaca"}`,
            borderRadius: 10,
            padding: "0.65rem 1rem",
            marginBottom: "1rem",
            fontSize: "0.8rem",
            color: csvMsg.includes("importada") ? "#16a34a" : "#dc2626",
            ...jost,
          }}
        >
          {csvMsg}
        </div>
      )}

      {showForm && (
        <div
          style={{
            background: "white",
            border: "1px solid rgba(12,26,61,0.1)",
            borderRadius: 14,
            padding: "1.5rem",
            marginBottom: "1.5rem",
            boxShadow: "0 2px 12px rgba(12,26,61,0.06)",
          }}
        >
          <p style={{ ...jost, fontSize: "0.82rem", fontWeight: 700, color: NAVY, marginBottom: "1.25rem" }}>
            Nova operação (grava em PropostaCredito)
          </p>
          <form onSubmit={addLead}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "0.75rem",
                marginBottom: "0.75rem",
              }}
            >
              <div>
                <label style={{ ...jost, display: "block", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(12,26,61,0.45)", marginBottom: 4 }}>
                  Nome *
                </label>
                <input style={inp} required value={novaOp.nome} onChange={(e) => setNovaOp((f) => ({ ...f, nome: e.target.value }))} />
              </div>
              <div>
                <label style={{ ...jost, display: "block", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(12,26,61,0.45)", marginBottom: 4 }}>
                  E-mail *
                </label>
                <input style={inp} type="email" required value={novaOp.email} onChange={(e) => setNovaOp((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label style={{ ...jost, display: "block", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(12,26,61,0.45)", marginBottom: 4 }}>
                  Localização
                </label>
                <input style={inp} value={novaOp.local} onChange={(e) => setNovaOp((f) => ({ ...f, local: e.target.value }))} />
              </div>
              <div>
                <label style={{ ...jost, display: "block", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(12,26,61,0.45)", marginBottom: 4 }}>
                  Valor
                </label>
                <input style={inp} placeholder="R$ 0" value={novaOp.valor} onChange={(e) => setNovaOp((f) => ({ ...f, valor: e.target.value }))} />
              </div>
              <div>
                <label style={{ ...jost, display: "block", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(12,26,61,0.45)", marginBottom: 4 }}>
                  Etapa inicial
                </label>
                <select
                  style={{ ...inp, appearance: "none", cursor: "pointer" }}
                  value={novaOp.etapa}
                  onChange={(e) => setNovaOp((f) => ({ ...f, etapa: e.target.value as PipelineEtapa }))}
                >
                  {ETAPAS.map((e) => (
                    <option key={e.key} value={e.key}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ ...jost, display: "block", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(12,26,61,0.45)", marginBottom: 4 }}>
                Notas
              </label>
              <textarea
                style={{ ...inp, resize: "vertical", minHeight: 60 }}
                value={novaOp.notas}
                onChange={(e) => setNovaOp((f) => ({ ...f, notas: e.target.value }))}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="submit" style={{ ...jost, fontSize: "0.8rem", fontWeight: 700, padding: "0.5rem 1.25rem", borderRadius: 10, border: "none", background: NAVY, color: "white", cursor: "pointer" }}>
                Salvar na API
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p style={{ ...jost, color: "#9ca3af", textAlign: "center", padding: "3rem 0" }}>Carregando pipeline…</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
          {visiveis.map((lead) => (
            <LeadCard
              key={`${lead.fonte}-${lead.id}`}
              lead={lead}
              onEtapaChange={moveEtapa}
              onDelete={deleteLead}
              moving={movingId === `${lead.fonte}:${lead.id}`}
            />
          ))}
          {visiveis.length === 0 && (
            <p style={{ ...jost, color: "#9ca3af", fontSize: "0.85rem", gridColumn: "1/-1", textAlign: "center", padding: "3rem 0" }}>
              Nenhuma operação nesta etapa. Leads de /envie-seu-projeto aparecem em Prospecção.
            </p>
          )}
        </div>
      )}

      <div style={{ marginTop: "2rem", background: "#f0f5ff", border: "1px solid #c7d7fa", borderRadius: 12, padding: "1rem 1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Building2 size={14} color={ROYAL} />
          <p style={{ ...jost, fontSize: "0.78rem", color: ROYAL, fontWeight: 600, margin: 0 }}>
            Mapa etapa → arquitetura
          </p>
        </div>
        <ul style={{ ...jost, fontSize: "0.72rem", color: "#4b6cb7", margin: "8px 0 0", paddingLeft: "1.1rem" }}>
          <li>Prospecção → Proposta RECEBIDA (lead externo)</li>
          <li>Em Análise → Proposta EM_ANALISE ou tomador vinculado</li>
          <li>Estruturação → Solicitação comitê PENDENTE / EM_COMITE</li>
          <li>Aprovado → Crédito ATIVO pós-comitê</li>
          <li>Standby → Proposta REJEITADA ou solicitação arquivada</li>
        </ul>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Building2, TrendingUp, Clock, CheckCircle2, AlertCircle, Filter, Plus, Trash2, X, ArrowLeft } from "lucide-react";

const NAVY = "#0C1A3D";
const ROYAL = "#1B4FD8";

type Etapa = "prospeccao" | "analise" | "estruturacao" | "aprovado" | "standby";

interface Lead {
  id: number;
  nome: string;
  local: string;
  tipo: string;
  valor: string | null;
  etapa: Etapa;
  responsavel: string | null;
  notas: string | null;
  contato: string | null;
  vendido: string | null;
  construido: string | null;
}

const LEADS_INICIAL: Lead[] = [
  { id: 1, nome: "Casa", local: "Penha, SC", tipo: "Bridge Loan", valor: "R$ 40.000.000", etapa: "prospeccao", responsavel: null, notas: null, contato: null, vendido: null, construido: null },
  { id: 2, nome: "Marouá (Finamob CWB)", local: "Curitiba, PR", tipo: "Bridge Loan", valor: "R$ 11.000.000", etapa: "analise", responsavel: null, notas: "Bridge loan + custo restante de obra", contato: null, vendido: "52%", construido: "10%" },
  { id: 3, nome: "Diret.com Construtoras", local: "—", tipo: "Canal / Parceria", valor: null, etapa: "estruturacao", responsavel: null, notas: "Canal de parceria com construtoras", contato: null, vendido: null, construido: null },
  { id: 4, nome: "Zah", local: "Praia Brava, Balneário Camboriú, SC", tipo: "Empréstimo Garantido", valor: "R$ 50.000.000", etapa: "analise", responsavel: null, notas: null, contato: null, vendido: null, construido: null },
  { id: 5, nome: "Galpão Logístico", local: "A definir", tipo: "A definir", valor: null, etapa: "prospeccao", responsavel: null, notas: null, contato: null, vendido: null, construido: null },
  { id: 6, nome: "Torre Boreal", local: "Sete Lagoas, BH, MG", tipo: "A definir", valor: "R$ 47.000.000", etapa: "prospeccao", responsavel: null, notas: null, contato: null, vendido: null, construido: null },
  { id: 7, nome: "MCMV Zona Leste", local: "São Paulo, SP", tipo: "Crédito Imobiliário", valor: "R$ 15.000.000", etapa: "prospeccao", responsavel: null, notas: null, contato: "Alexandre", vendido: null, construido: null },
  { id: 8, nome: "Rio Verde", local: "Rio Verde, GO", tipo: "A definir", valor: "R$ 100.000.000", etapa: "prospeccao", responsavel: null, notas: null, contato: null, vendido: null, construido: null },
];

const ETAPAS: { key: Etapa; label: string; color: string; bg: string }[] = [
  { key: "prospeccao",   label: "Prospecção",   color: "#6b7280", bg: "#f3f4f6" },
  { key: "analise",      label: "Em Análise",   color: "#d97706", bg: "#fffbeb" },
  { key: "estruturacao", label: "Estruturação", color: ROYAL,     bg: "#eff6ff" },
  { key: "aprovado",     label: "Aprovado",     color: "#16a34a", bg: "#f0fdf4" },
  { key: "standby",      label: "Standby",      color: "#9333ea", bg: "#faf5ff" },
];

const ETAPA_ICON: Record<Etapa, typeof Clock> = {
  prospeccao:   Clock,
  analise:      AlertCircle,
  estruturacao: TrendingUp,
  aprovado:     CheckCircle2,
  standby:      Clock,
};

function brl(v: string | null) { return v ?? "A definir"; }

const jost = { fontFamily: "'Jost', sans-serif" } as const;
const inp = { fontFamily: "'Jost', sans-serif", width: "100%", padding: "0.55rem 0.85rem", border: "1px solid rgba(12,26,61,0.14)", borderRadius: 8, fontSize: "0.82rem", color: NAVY, outline: "none", background: "white" } as const;

type NovaOp = { nome: string; local: string; tipo: string; valor: string; etapa: Etapa; notas: string; contato: string };
const OP_VAZIA: NovaOp = { nome: "", local: "", tipo: "", valor: "", etapa: "prospeccao", notas: "", contato: "" };

function LeadCard({
  lead,
  onEtapaChange,
  onDelete,
}: {
  lead: Lead;
  onEtapaChange: (id: number, e: Etapa) => void;
  onDelete: (id: number) => void;
}) {
  const etapa = ETAPAS.find((e) => e.key === lead.etapa)!;
  const Icon = ETAPA_ICON[lead.etapa];
  const [confirmando, setConfirmando] = useState(false);

  return (
    <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 14, padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: "0.95rem", color: NAVY, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.nome}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
            <MapPin size={11} color="#9ca3af" />
            <p style={{ fontSize: "0.72rem", color: "#6b7280", margin: 0 }}>{lead.local}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: etapa.bg, color: etapa.color, display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
            <Icon size={10} />{etapa.label}
          </span>
          <button
            onClick={() => setConfirmando(true)}
            title="Excluir operação"
            style={{ background: "none", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", color: "#ef4444", padding: "10px 10px", display: "flex", alignItems: "center", flexShrink: 0, transition: "all 0.12s" }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Inline delete confirmation */}
      {confirmando && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ ...jost, fontSize: "0.78rem", fontWeight: 600, color: "#dc2626", margin: 0 }}>Excluir esta operação?</p>
          <p style={{ ...jost, fontSize: "0.72rem", color: "#9ca3af", margin: 0 }}>Esta ação é irreversível.</p>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => onDelete(lead.id)} style={{ ...jost, flex: 1, fontSize: "0.78rem", fontWeight: 700, background: "#dc2626", color: "white", border: "none", borderRadius: 8, padding: "0.45rem 0", cursor: "pointer" }}>Sim, excluir</button>
            <button onClick={() => setConfirmando(false)} style={{ ...jost, flex: 1, fontSize: "0.78rem", fontWeight: 600, background: "white", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: 8, padding: "0.45rem 0", cursor: "pointer" }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        <div style={{ background: "#f9fafb", borderRadius: 8, padding: "0.5rem 0.6rem" }}>
          <p style={{ fontSize: "0.62rem", color: "#9ca3af", margin: 0 }}>Tipo</p>
          <p style={{ fontSize: "0.78rem", fontWeight: 600, color: NAVY, margin: 0 }}>{lead.tipo || "A definir"}</p>
        </div>
        <div style={{ background: "#f9fafb", borderRadius: 8, padding: "0.5rem 0.6rem" }}>
          <p style={{ fontSize: "0.62rem", color: "#9ca3af", margin: 0 }}>Valor</p>
          <p style={{ fontSize: "0.78rem", fontWeight: 600, color: NAVY, margin: 0 }}>{brl(lead.valor)}</p>
        </div>
        {lead.vendido && (
          <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "0.5rem 0.6rem" }}>
            <p style={{ fontSize: "0.62rem", color: "#9ca3af", margin: 0 }}>Vendido</p>
            <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "#16a34a", margin: 0 }}>{lead.vendido}</p>
          </div>
        )}
        {lead.construido && (
          <div style={{ background: "#fffbeb", borderRadius: 8, padding: "0.5rem 0.6rem" }}>
            <p style={{ fontSize: "0.62rem", color: "#9ca3af", margin: 0 }}>Construído</p>
            <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "#d97706", margin: 0 }}>{lead.construido}</p>
          </div>
        )}
        {lead.contato && (
          <div style={{ background: "#f9fafb", borderRadius: 8, padding: "0.5rem 0.6rem" }}>
            <p style={{ fontSize: "0.62rem", color: "#9ca3af", margin: 0 }}>Contato</p>
            <p style={{ fontSize: "0.78rem", fontWeight: 600, color: NAVY, margin: 0 }}>{lead.contato}</p>
          </div>
        )}
      </div>

      {lead.notas && (
        <p style={{ fontSize: "0.72rem", color: "#6b7280", background: "#f9fafb", borderRadius: 8, padding: "0.5rem 0.6rem", margin: 0 }}>
          {lead.notas}
        </p>
      )}

      {/* Etapa selector */}
      <div>
        <p style={{ fontSize: "0.62rem", color: "#9ca3af", marginBottom: 4 }}>Mover para</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {ETAPAS.map((e) => (
            <button
              key={e.key}
              onClick={() => onEtapaChange(lead.id, e.key)}
              style={{
                fontSize: "0.65rem", fontWeight: 600, padding: "8px 10px", borderRadius: 20,
                border: `1px solid ${lead.etapa === e.key ? e.color : "#e5e7eb"}`,
                background: lead.etapa === e.key ? e.bg : "white",
                color: lead.etapa === e.key ? e.color : "#9ca3af",
                cursor: lead.etapa === e.key ? "default" : "pointer",
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
  const [leads, setLeads] = useState<Lead[]>(LEADS_INICIAL);
  const [filtro, setFiltro] = useState<Etapa | "todos">("todos");
  const [showForm, setShowForm] = useState(false);
  const [novaOp, setNovaOp] = useState<NovaOp>(OP_VAZIA);

  const moveEtapa = (id: number, etapa: Etapa) =>
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, etapa } : l)));

  const deleteLead = (id: number) =>
    setLeads((prev) => prev.filter((l) => l.id !== id));

  const addLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaOp.nome.trim()) return;
    const newId = Math.max(0, ...leads.map((l) => l.id)) + 1;
    setLeads((prev) => [
      ...prev,
      {
        id: newId,
        nome: novaOp.nome.trim(),
        local: novaOp.local.trim() || "A definir",
        tipo: novaOp.tipo.trim() || "A definir",
        valor: novaOp.valor.trim() || null,
        etapa: novaOp.etapa,
        responsavel: null,
        notas: novaOp.notas.trim() || null,
        contato: novaOp.contato.trim() || null,
        vendido: null,
        construido: null,
      },
    ]);
    setNovaOp(OP_VAZIA);
    setShowForm(false);
  };

  const visiveis = filtro === "todos" ? leads : leads.filter((l) => l.etapa === filtro);
  const totalValor = leads.reduce((acc, l) => {
    if (!l.valor) return acc;
    const n = Number(l.valor.replace(/[^0-9]/g, ""));
    return acc + n;
  }, 0);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 0 3rem" }}>
      <button onClick={() => router.push("/dashboard/admin")} style={{ ...jost, display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: "0.82rem", fontWeight: 500, padding: "0.4rem 0", marginBottom: "1rem" }}>
        <ArrowLeft size={15} /> Voltar
      </button>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ ...jost, fontSize: "1.4rem", fontWeight: 700, color: NAVY, margin: 0 }}>Pipeline de Operações</h1>
          <p style={{ ...jost, fontSize: "0.8rem", color: "#6b7280", margin: "4px 0 0" }}>
            {leads.length} operações · Potencial total:{" "}
            <strong style={{ color: ROYAL }}>
              {totalValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
            </strong>
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Filter */}
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
                    ...jost, fontSize: "0.72rem", fontWeight: 600, padding: "10px 12px", borderRadius: 20,
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

          {/* Add button */}
          <button
            onClick={() => setShowForm((s) => !s)}
            style={{
              ...jost, display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: "0.8rem", fontWeight: 700,
              padding: "0.5rem 1.1rem", borderRadius: 10, border: "none", cursor: "pointer",
              background: showForm ? "rgba(12,26,61,0.6)" : NAVY,
              color: "white", transition: "background 0.15s", flexShrink: 0,
            }}
          >
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {showForm ? "Cancelar" : "Nova operação"}
          </button>
        </div>
      </div>

      {/* New operation form */}
      {showForm && (
        <div style={{ background: "white", border: "1px solid rgba(12,26,61,0.1)", borderRadius: 14, padding: "1.5rem", marginBottom: "1.5rem", boxShadow: "0 2px 12px rgba(12,26,61,0.06)" }}>
          <p style={{ ...jost, fontSize: "0.82rem", fontWeight: 700, color: NAVY, marginBottom: "1.25rem" }}>Nova operação</p>
          <form onSubmit={addLead}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div>
                <label style={{ ...jost, display: "block", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(12,26,61,0.45)", marginBottom: 4 }}>Nome *</label>
                <input style={inp} placeholder="Ex: Torre Beira Rio" value={novaOp.nome} onChange={(e) => setNovaOp((f) => ({ ...f, nome: e.target.value }))} required />
              </div>
              <div>
                <label style={{ ...jost, display: "block", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(12,26,61,0.45)", marginBottom: 4 }}>Localização</label>
                <input style={inp} placeholder="Cidade, UF" value={novaOp.local} onChange={(e) => setNovaOp((f) => ({ ...f, local: e.target.value }))} />
              </div>
              <div>
                <label style={{ ...jost, display: "block", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(12,26,61,0.45)", marginBottom: 4 }}>Tipo</label>
                <input style={inp} placeholder="Bridge Loan, Crédito Imobiliário…" value={novaOp.tipo} onChange={(e) => setNovaOp((f) => ({ ...f, tipo: e.target.value }))} />
              </div>
              <div>
                <label style={{ ...jost, display: "block", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(12,26,61,0.45)", marginBottom: 4 }}>Valor</label>
                <input style={inp} placeholder="R$ 0.000.000" value={novaOp.valor} onChange={(e) => setNovaOp((f) => ({ ...f, valor: e.target.value }))} />
              </div>
              <div>
                <label style={{ ...jost, display: "block", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(12,26,61,0.45)", marginBottom: 4 }}>Etapa inicial</label>
                <select
                  style={{ ...inp, appearance: "none", cursor: "pointer" }}
                  value={novaOp.etapa}
                  onChange={(e) => setNovaOp((f) => ({ ...f, etapa: e.target.value as Etapa }))}
                >
                  {ETAPAS.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ ...jost, display: "block", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(12,26,61,0.45)", marginBottom: 4 }}>Contato</label>
                <input style={inp} placeholder="Nome do contato" value={novaOp.contato} onChange={(e) => setNovaOp((f) => ({ ...f, contato: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ ...jost, display: "block", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(12,26,61,0.45)", marginBottom: 4 }}>Notas</label>
              <textarea
                style={{ ...inp, resize: "vertical", minHeight: 60 }}
                placeholder="Observações, contexto do projeto…"
                value={novaOp.notas}
                onChange={(e) => setNovaOp((f) => ({ ...f, notas: e.target.value }))}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={() => { setShowForm(false); setNovaOp(OP_VAZIA); }} style={{ ...jost, fontSize: "0.8rem", fontWeight: 600, padding: "0.5rem 1.1rem", borderRadius: 10, border: "1px solid rgba(12,26,61,0.12)", background: "white", color: "#6b7280", cursor: "pointer" }}>
                Cancelar
              </button>
              <button type="submit" style={{ ...jost, fontSize: "0.8rem", fontWeight: 700, padding: "0.5rem 1.25rem", borderRadius: 10, border: "none", background: NAVY, color: "white", cursor: "pointer" }}>
                Adicionar operação
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: "1.5rem" }}>
        {ETAPAS.map((e) => {
          const count = leads.filter((l) => l.etapa === e.key).length;
          return (
            <div key={e.key} style={{ background: e.bg, border: `1px solid ${e.color}22`, borderRadius: 10, padding: "0.6rem 0.85rem" }}>
              <p style={{ ...jost, fontSize: "0.62rem", color: e.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>{e.label}</p>
              <p style={{ fontSize: "1.3rem", fontWeight: 700, color: e.color, margin: 0 }}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
        {visiveis.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onEtapaChange={moveEtapa} onDelete={deleteLead} />
        ))}
        {visiveis.length === 0 && (
          <p style={{ ...jost, color: "#9ca3af", fontSize: "0.85rem", gridColumn: "1/-1", textAlign: "center", padding: "3rem 0" }}>
            Nenhuma operação nesta etapa.
          </p>
        )}
      </div>

      {/* Partner note */}
      <div style={{ marginTop: "2rem", background: "#f0f5ff", border: "1px solid #c7d7fa", borderRadius: 12, padding: "1rem 1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Building2 size={14} color={ROYAL} />
          <p style={{ ...jost, fontSize: "0.78rem", color: ROYAL, fontWeight: 600, margin: 0 }}>Acesso restrito aos sócios administradores</p>
        </div>
        <p style={{ ...jost, fontSize: "0.72rem", color: "#4b6cb7", margin: "4px 0 0" }}>
          Cada sócio visualiza as operações da sua responsabilidade. A atribuição de responsável será configurada em breve.
        </p>
      </div>
    </div>
  );
}

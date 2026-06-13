"use client";

import { useState } from "react";
import { MapPin, Building2, TrendingUp, Clock, CheckCircle2, AlertCircle, Filter } from "lucide-react";

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

const LEADS: Lead[] = [
  {
    id: 1,
    nome: "Casa",
    local: "Penha, SC",
    tipo: "Bridge Loan",
    valor: "R$ 40.000.000",
    etapa: "prospeccao",
    responsavel: null,
    notas: null,
    contato: null,
    vendido: null,
    construido: null,
  },
  {
    id: 2,
    nome: "Marouá (Finamob CWB)",
    local: "Curitiba, PR",
    tipo: "Bridge Loan",
    valor: "R$ 11.000.000",
    etapa: "analise",
    responsavel: null,
    notas: "Bridge loan + custo restante de obra",
    contato: null,
    vendido: "52%",
    construido: "10%",
  },
  {
    id: 3,
    nome: "Diret.com Construtoras",
    local: "—",
    tipo: "Canal / Parceria",
    valor: null,
    etapa: "estruturacao",
    responsavel: null,
    notas: "Canal de parceria com construtoras",
    contato: null,
    vendido: null,
    construido: null,
  },
  {
    id: 4,
    nome: "Zah",
    local: "Praia Brava, Balneário Camboriú, SC",
    tipo: "Empréstimo Garantido",
    valor: "R$ 50.000.000",
    etapa: "analise",
    responsavel: null,
    notas: null,
    contato: null,
    vendido: null,
    construido: null,
  },
  {
    id: 5,
    nome: "Galpão Logístico",
    local: "A definir",
    tipo: "A definir",
    valor: null,
    etapa: "prospeccao",
    responsavel: null,
    notas: null,
    contato: null,
    vendido: null,
    construido: null,
  },
  {
    id: 6,
    nome: "Torre Boreal",
    local: "Sete Lagoas, BH, MG",
    tipo: "A definir",
    valor: "R$ 47.000.000",
    etapa: "prospeccao",
    responsavel: null,
    notas: null,
    contato: null,
    vendido: null,
    construido: null,
  },
  {
    id: 7,
    nome: "MCMV Zona Leste",
    local: "São Paulo, SP",
    tipo: "Crédito Imobiliário",
    valor: "R$ 15.000.000",
    etapa: "prospeccao",
    responsavel: null,
    notas: null,
    contato: "Alexandre",
    vendido: null,
    construido: null,
  },
  {
    id: 8,
    nome: "Rio Verde",
    local: "Rio Verde, GO",
    tipo: "A definir",
    valor: "R$ 100.000.000",
    etapa: "prospeccao",
    responsavel: null,
    notas: null,
    contato: null,
    vendido: null,
    construido: null,
  },
];

const ETAPAS: { key: Etapa; label: string; color: string; bg: string }[] = [
  { key: "prospeccao",   label: "Prospecção",    color: "#6b7280", bg: "#f3f4f6" },
  { key: "analise",      label: "Em Análise",    color: "#d97706", bg: "#fffbeb" },
  { key: "estruturacao", label: "Estruturação",  color: ROYAL,     bg: "#eff6ff" },
  { key: "aprovado",     label: "Aprovado",      color: "#16a34a", bg: "#f0fdf4" },
  { key: "standby",      label: "Standby",       color: "#9333ea", bg: "#faf5ff" },
];

const ETAPA_ICON: Record<Etapa, typeof Clock> = {
  prospeccao:   Clock,
  analise:      AlertCircle,
  estruturacao: TrendingUp,
  aprovado:     CheckCircle2,
  standby:      Clock,
};

function brl(v: string | null) {
  return v ?? "A definir";
}

function LeadCard({ lead, onEtapaChange }: { lead: Lead; onEtapaChange: (id: number, e: Etapa) => void }) {
  const etapa = ETAPAS.find((e) => e.key === lead.etapa)!;
  const Icon = ETAPA_ICON[lead.etapa];

  return (
    <div style={{
      background: "white",
      border: "1px solid #e5e7eb",
      borderRadius: 14,
      padding: "1.25rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.75rem",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: "0.95rem", color: NAVY, margin: 0 }}>{lead.nome}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
            <MapPin size={11} color="#9ca3af" />
            <p style={{ fontSize: "0.72rem", color: "#6b7280", margin: 0 }}>{lead.local}</p>
          </div>
        </div>
        <span style={{
          fontSize: "0.68rem", fontWeight: 600,
          padding: "3px 8px", borderRadius: 20,
          background: etapa.bg, color: etapa.color,
          display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
        }}>
          <Icon size={10} />
          {etapa.label}
        </span>
      </div>

      {/* Info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        <div style={{ background: "#f9fafb", borderRadius: 8, padding: "0.5rem 0.6rem" }}>
          <p style={{ fontSize: "0.62rem", color: "#9ca3af", margin: 0 }}>Tipo</p>
          <p style={{ fontSize: "0.78rem", fontWeight: 600, color: NAVY, margin: 0 }}>{lead.tipo}</p>
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
                fontSize: "0.65rem", fontWeight: 600, padding: "3px 8px", borderRadius: 20,
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
  const [leads, setLeads] = useState<Lead[]>(LEADS);
  const [filtro, setFiltro] = useState<Etapa | "todos">("todos");

  const moveEtapa = (id: number, etapa: Etapa) => {
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, etapa } : l));
  };

  const visiveis = filtro === "todos" ? leads : leads.filter((l) => l.etapa === filtro);
  const totalValor = leads.reduce((acc, l) => {
    if (!l.valor) return acc;
    const n = Number(l.valor.replace(/[^0-9]/g, ""));
    return acc + n;
  }, 0);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 0 3rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: NAVY, margin: 0 }}>Pipeline de Operações</h1>
          <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: "4px 0 0" }}>
            {leads.length} operações · Potencial total:{" "}
            <strong style={{ color: ROYAL }}>
              {totalValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
            </strong>
          </p>
        </div>

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
                  fontSize: "0.72rem", fontWeight: 600, padding: "5px 12px", borderRadius: 20,
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
      </div>

      {/* Summary bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: "1.5rem" }}>
        {ETAPAS.map((e) => {
          const count = leads.filter((l) => l.etapa === e.key).length;
          return (
            <div key={e.key} style={{ background: e.bg, border: `1px solid ${e.color}22`, borderRadius: 10, padding: "0.6rem 0.85rem" }}>
              <p style={{ fontSize: "0.62rem", color: e.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>{e.label}</p>
              <p style={{ fontSize: "1.3rem", fontWeight: 700, color: e.color, margin: 0 }}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
        {visiveis.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onEtapaChange={moveEtapa} />
        ))}
        {visiveis.length === 0 && (
          <p style={{ color: "#9ca3af", fontSize: "0.85rem", gridColumn: "1/-1", textAlign: "center", padding: "3rem 0" }}>
            Nenhuma operação nesta etapa.
          </p>
        )}
      </div>

      {/* Partner note */}
      <div style={{ marginTop: "2rem", background: "#f0f5ff", border: "1px solid #c7d7fa", borderRadius: 12, padding: "1rem 1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Building2 size={14} color={ROYAL} />
          <p style={{ fontSize: "0.78rem", color: ROYAL, fontWeight: 600, margin: 0 }}>Acesso restrito aos sócios administradores</p>
        </div>
        <p style={{ fontSize: "0.72rem", color: "#4b6cb7", margin: "4px 0 0" }}>
          Cada sócio visualiza as operações da sua responsabilidade. A atribuição de responsável será configurada em breve.
        </p>
      </div>
    </div>
  );
}

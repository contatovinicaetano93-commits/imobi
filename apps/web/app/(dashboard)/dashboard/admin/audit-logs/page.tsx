"use client";

import { useEffect, useState, useCallback } from "react";
import type { CSSProperties } from "react";
import {
  ShieldCheck, ChevronLeft, ChevronRight, Search,
  UserPlus, UserX, Lock, Unlock, RefreshCw, AlertCircle,
} from "lucide-react";

const NAVY  = "#0C1A3D";
const ROYAL = "#1B4FD8";
const MINT  = "#4ADE80";

const j: CSSProperties  = { fontFamily: "'Jost', sans-serif" };
const bc: CSSProperties = { fontFamily: "'Barlow Condensed', sans-serif" };

type AuditLog = {
  auditId: string;
  acaoTipo: string;
  detalhes: string | null;
  criadoEm: string;
  admin: { nome: string; email: string } | null;
  alvo: { nome: string; email: string } | null;
};

type PageData = {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
};

const ACAO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof UserPlus }> = {
  USUARIO_CRIADO:        { label: "Usuário criado",      color: "#16a34a", bg: "#f0fdf4", icon: UserPlus },
  USUARIO_EXCLUIDO:      { label: "Usuário excluído",    color: "#dc2626", bg: "#fef2f2", icon: UserX },
  USUARIO_BLOQUEADO:     { label: "Conta bloqueada",     color: "#d97706", bg: "#fffbeb", icon: Lock },
  USUARIO_DESBLOQUEADO:  { label: "Conta desbloqueada",  color: "#0284c7", bg: "#f0f9ff", icon: Unlock },
  USUARIO_TIPO_ALTERADO: { label: "Perfil alterado",     color: ROYAL,    bg: "rgba(27,79,216,0.07)", icon: ShieldCheck },
};

function acaoConfig(tipo: string) {
  return ACAO_CONFIG[tipo] ?? { label: tipo, color: NAVY, bg: "#f8fafc", icon: AlertCircle };
}

function formatarData(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

const PAGE_SIZE = 20;

export default function AuditLogsPage() {
  const [data, setData]       = useState<PageData | null>(null);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetchLogs = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const offset = (p - 1) * PAGE_SIZE;
      const res = await fetch(
        `/api/proxy/admin/audit-logs?limit=${PAGE_SIZE}&offset=${offset}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(page); }, [page, fetchLogs]);

  const filteredLogs = (data?.logs ?? []).filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.admin?.nome.toLowerCase().includes(q) ||
      l.admin?.email.toLowerCase().includes(q) ||
      l.alvo?.nome.toLowerCase().includes(q) ||
      l.alvo?.email.toLowerCase().includes(q) ||
      l.acaoTipo.toLowerCase().includes(q) ||
      (l.detalhes ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div style={{ ...j, minHeight: "100vh", background: "#F7F8FA", padding: "32px 24px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `rgba(27,79,216,0.1)`, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <ShieldCheck size={20} color={ROYAL} />
        </div>
        <div>
          <h1 style={{ ...bc, fontSize: 22, fontWeight: 700, color: NAVY, margin: 0, letterSpacing: 0.3 }}>
            Logs de Auditoria
          </h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
            Registro de ações administrativas sensíveis
          </p>
        </div>
        <button
          onClick={() => fetchLogs(page)}
          disabled={loading}
          style={{
            marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 8, border: `1px solid rgba(12,26,61,0.12)`,
            background: "white", cursor: "pointer", fontSize: 13, color: NAVY,
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : undefined }} />
          Atualizar
        </button>
      </div>

      {/* Search */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
        background: "white", border: "1px solid rgba(12,26,61,0.1)", borderRadius: 10, padding: "8px 14px",
        maxWidth: 400,
      }}>
        <Search size={15} color="#94a3b8" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrar por admin, usuário ou ação..."
          style={{ border: "none", outline: "none", fontSize: 13, color: NAVY, width: "100%", background: "transparent" }}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px",
          display: "flex", alignItems: "center", gap: 8, color: "#dc2626", fontSize: 13, marginBottom: 16,
        }}>
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: "white", border: "1px solid rgba(12,26,61,0.08)", borderRadius: 14, overflow: "hidden" }}>
        {/* Table header */}
        <div style={{
          display: "grid", gridTemplateColumns: "180px 1fr 1fr 180px auto",
          padding: "10px 16px", background: "#f8fafc", borderBottom: "1px solid rgba(12,26,61,0.06)",
          fontSize: 11, fontWeight: 600, color: "#64748b", letterSpacing: 0.5, textTransform: "uppercase",
        }}>
          <span>Ação</span>
          <span>Admin</span>
          <span>Usuário alvo</span>
          <span>Detalhes</span>
          <span>Data</span>
        </div>

        {/* Rows */}
        {loading && !data ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            Carregando...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            {search ? "Nenhum resultado para o filtro." : "Nenhum log de auditoria encontrado."}
          </div>
        ) : (
          filteredLogs.map((log, idx) => {
            const cfg = acaoConfig(log.acaoTipo);
            const Icon = cfg.icon;
            return (
              <div
                key={log.auditId}
                style={{
                  display: "grid", gridTemplateColumns: "180px 1fr 1fr 180px auto",
                  padding: "12px 16px", alignItems: "center", gap: 8,
                  borderBottom: idx < filteredLogs.length - 1 ? "1px solid rgba(12,26,61,0.05)" : "none",
                  background: idx % 2 === 0 ? "white" : "#fafafa",
                }}
              >
                {/* Ação */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "3px 8px", borderRadius: 6, width: "fit-content",
                  background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 600,
                }}>
                  <Icon size={11} />
                  {cfg.label}
                </div>

                {/* Admin */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: NAVY }}>
                    {log.admin?.nome ?? "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{log.admin?.email}</div>
                </div>

                {/* Alvo */}
                <div>
                  {log.alvo ? (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 500, color: NAVY }}>{log.alvo.nome}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{log.alvo.email}</div>
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: "#cbd5e1" }}>—</span>
                  )}
                </div>

                {/* Detalhes */}
                <div style={{ fontSize: 12, color: "#475569", wordBreak: "break-word" }}>
                  {log.detalhes ?? <span style={{ color: "#cbd5e1" }}>—</span>}
                </div>

                {/* Data */}
                <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>
                  {formatarData(log.criadoEm)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginTop: 16, fontSize: 13, color: "#64748b",
      }}>
        <span>
          {data ? `${data.total} registro${data.total !== 1 ? "s" : ""}` : "—"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            style={{
              padding: "6px 10px", borderRadius: 7, border: "1px solid rgba(12,26,61,0.12)",
              background: "white", cursor: page === 1 ? "not-allowed" : "pointer",
              opacity: page === 1 ? 0.4 : 1, display: "flex", alignItems: "center",
            }}
          >
            <ChevronLeft size={14} color={NAVY} />
          </button>

          <span style={{ fontWeight: 500, color: NAVY }}>
            {page} / {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            style={{
              padding: "6px 10px", borderRadius: 7, border: "1px solid rgba(12,26,61,0.12)",
              background: "white", cursor: page === totalPages ? "not-allowed" : "pointer",
              opacity: page === totalPages ? 0.4 : 1, display: "flex", alignItems: "center",
            }}
          >
            <ChevronRight size={14} color={NAVY} />
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

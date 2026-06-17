"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck, AlertTriangle, Info, CheckCircle2, X } from "lucide-react";
import type { Notificacao } from "@/lib/api";

const TIPO_CONFIG: Record<string, { icon: typeof Bell; cls: string }> = {
  OBRA_PARADA:    { icon: AlertTriangle, cls: "text-red-600 bg-red-50" },
  VISTORIA:       { icon: Bell,          cls: "text-blue-600 bg-blue-50" },
  CHECKLIST:      { icon: CheckCircle2,  cls: "text-green-600 bg-green-50" },
  DESVIO:         { icon: AlertTriangle, cls: "text-amber-600 bg-amber-50" },
  default:        { icon: Info,          cls: "text-gray-600 bg-gray-50" },
};

export default function AlertasPage() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [marcando, setMarcando] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/proxy/notificacoes?limit=50")
      .then((r) => r.ok ? r.json() : { notificacoes: [] })
      .catch(() => ({ notificacoes: [] }))
      .then((d: { notificacoes: Notificacao[] }) => {
        setNotificacoes(d.notificacoes ?? []);
        setLoading(false);
      });
  }, []);

  async function marcarLida(id: string) {
    setMarcando(id);
    try {
      await fetch(`/api/proxy/notificacoes/${id}/lida`, { method: "PATCH" });
      setNotificacoes((prev) =>
        prev.map((n) => n.notificacaoId === id ? { ...n, lida: true } : n)
      );
    } finally {
      setMarcando(null);
    }
  }

  async function marcarTodasLidas() {
    setMarcando("all");
    try {
      await fetch("/api/proxy/notificacoes/marcar-todas-lidas", { method: "PATCH" });
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    } finally {
      setMarcando(null);
    }
  }

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div style={{ background: "linear-gradient(135deg, #431407 0%, #7c2d12 100%)", borderRadius: 16, padding: "1.5rem", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ background: "#ea580c22", border: "1px solid #ea580c44", borderRadius: 8, padding: "0.4rem" }}>
              <Bell size={18} color="#ea580c" />
            </div>
            <div>
              <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Engenheiro</p>
              <h1 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>Alertas</h1>
            </div>
          </div>
          {naoLidas > 0 && (
            <span style={{ background: "#ea580c", borderRadius: 9999, padding: "0.25rem 0.65rem", fontSize: "0.7rem", fontWeight: 700 }}>
              {naoLidas} não lida(s)
            </span>
          )}
        </div>
        <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", margin: "0.5rem 0 0" }}>
          Alertas de obra parada, desvios e checklist das obras sob sua responsabilidade
        </p>
      </div>

      {naoLidas > 0 && (
        <div className="flex justify-end">
          <button
            onClick={marcarTodasLidas}
            disabled={marcando === "all"}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
          >
            <CheckCheck size={13} />
            {marcando === "all" ? "Marcando…" : "Marcar todas como lidas"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : notificacoes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">Nenhum alerta no momento</p>
          <p className="text-xs text-gray-400 mt-1">Você será notificado sobre obras paradas, desvios e vistorias.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notificacoes.map((n) => {
            const cfg = TIPO_CONFIG[n.tipo] ?? TIPO_CONFIG.default;
            const Icon = cfg.icon;
            return (
              <div
                key={n.notificacaoId}
                className={`bg-white rounded-2xl border shadow-sm p-5 transition-opacity ${n.lida ? "opacity-60 border-gray-100" : "border-[#ea580c30]"}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.cls}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">{n.titulo}</p>
                      {!n.lida && (
                        <button
                          onClick={() => marcarLida(n.notificacaoId)}
                          disabled={marcando === n.notificacaoId}
                          className="shrink-0 text-gray-300 hover:text-gray-600 transition"
                          title="Marcar como lida"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.mensagem}</p>
                    <p className="text-[10px] text-gray-400 mt-2 tabular-nums">
                      {new Date(n.criadoEm).toLocaleDateString("pt-BR", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                      {n.lida && " · lida"}
                    </p>
                  </div>
                </div>
                {n.link && (
                  <a
                    href={n.link}
                    className="mt-3 text-xs font-semibold text-[#ea580c] hover:underline inline-flex items-center gap-1"
                  >
                    Ver detalhes →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

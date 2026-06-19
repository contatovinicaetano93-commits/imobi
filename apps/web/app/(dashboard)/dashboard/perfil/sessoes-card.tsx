"use client";
import { useState, useEffect, useCallback } from "react";
import { Monitor, Loader2 } from "lucide-react";
import { sessoesApi, type SessaoAtiva } from "@/lib/api";

export function SessoesCard() {
  const [sessoes, setSessoes] = useState<SessaoAtiva[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const data = await sessoesApi.listar();
      setSessoes(data);
    } catch {
      setSessoes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const handleRevogar = async (sessionId: string) => {
    setRevoking(sessionId);
    try {
      await sessoesApi.revogar(sessionId);
      await carregar();
    } finally {
      setRevoking(null);
    }
  };

  const handleRevogarTodas = async () => {
    setRevokingAll(true);
    try {
      await sessoesApi.revogarTodas();
      await carregar();
    } finally {
      setRevokingAll(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Dispositivos conectados</h2>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando sessões...
        </div>
      ) : sessoes.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">Nenhuma sessão ativa encontrada.</p>
      ) : (
        <div className="space-y-2">
          {sessoes.map((s) => (
            <div
              key={s.sessionId}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Monitor className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate max-w-xs">
                    {s.userAgent ? s.userAgent.slice(0, 60) : "Dispositivo desconhecido"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {s.ip ?? "IP desconhecido"} ·{" "}
                    {new Date(s.criadoEm).toLocaleDateString("pt-BR", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleRevogar(s.sessionId)}
                disabled={!!revoking}
                className="shrink-0 text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-40 transition-colors"
              >
                {revoking === s.sessionId ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  "Encerrar"
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {sessoes.length > 1 && (
        <button
          onClick={handleRevogarTodas}
          disabled={revokingAll}
          className="mt-4 text-sm font-semibold text-gray-500 hover:text-red-600 disabled:opacity-40 transition-colors"
        >
          {revokingAll ? "Encerrando..." : "Encerrar todos os outros dispositivos"}
        </button>
      )}
    </div>
  );
}

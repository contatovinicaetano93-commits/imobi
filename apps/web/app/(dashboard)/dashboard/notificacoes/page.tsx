"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { notificacoesApi, type Notificacao } from "@/lib/api";

type Tab = "todas" | "nao-lidas";

export default function NotificacoesPage() {
  const router = useRouter();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("todas");
  const [marcandoTodas, setMarcandoTodas] = useState(false);

  useEffect(() => {
    notificacoesApi
      .listar()
      .then((res) => setNotificacoes(res.notificacoes ?? []))
      .catch(() => setNotificacoes([]))
      .finally(() => setLoading(false));
  }, []);

  async function marcarLida(notificacao: Notificacao) {
    if (!notificacao.lida) {
      await notificacoesApi.marcarComoLida(notificacao.notificacaoId).catch(() => null);
      setNotificacoes((prev) =>
        prev.map((n) =>
          n.notificacaoId === notificacao.notificacaoId
            ? { ...n, lida: true, lidoEm: new Date().toISOString() }
            : n
        )
      );
    }
    if (notificacao.link) {
      router.push(notificacao.link);
    }
  }

  async function deletar(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await notificacoesApi.deletar(id).catch(() => null);
    setNotificacoes((prev) => prev.filter((n) => n.notificacaoId !== id));
  }

  async function marcarTodasLidas() {
    setMarcandoTodas(true);
    await notificacoesApi.marcarTudasComoLidas().catch(() => null);
    setNotificacoes((prev) =>
      prev.map((n) => ({ ...n, lida: true, lidoEm: n.lidoEm ?? new Date().toISOString() }))
    );
    setMarcandoTodas(false);
  }

  const filtradas =
    tab === "nao-lidas" ? notificacoes.filter((n) => !n.lida) : notificacoes;

  const naoLidasCount = notificacoes.filter((n) => !n.lida).length;

  function formatarData(iso: string) {
    const d = new Date(iso);
    const agora = new Date();
    const diff = Math.floor((agora.getTime() - d.getTime()) / 1000);
    if (diff < 60) return "agora mesmo";
    if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d atrás`;
    return d.toLocaleDateString("pt-BR");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
        {naoLidasCount > 0 && (
          <button
            onClick={marcarTodasLidas}
            disabled={marcandoTodas}
            className="text-sm font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50 transition-colors"
          >
            {marcandoTodas ? "Marcando..." : "Marcar todas como lidas"}
          </button>
        )}
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["todas", "nao-lidas"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "todas" ? "Todas" : `Não lidas${naoLidasCount > 0 ? ` (${naoLidasCount})` : ""}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse"
            >
              <div className="flex items-start gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-200 mt-1.5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <p className="text-4xl mb-4">🔔</p>
          <p className="text-gray-500">
            {tab === "nao-lidas"
              ? "Nenhuma notificação não lida."
              : "Você não tem notificações."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map((n) => (
            <div
              key={n.notificacaoId}
              onClick={() => marcarLida(n)}
              className={`bg-white rounded-2xl border shadow-sm p-5 flex items-start gap-4 transition-colors ${
                n.link ? "cursor-pointer hover:bg-gray-50" : ""
              } ${n.lida ? "border-gray-100" : "border-brand-200"}`}
            >
              <div className="mt-1.5 shrink-0">
                {n.lida ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold ${n.lida ? "text-gray-700" : "text-gray-900"}`}>
                    {n.titulo}
                  </p>
                  <span className="text-xs text-gray-400 shrink-0">{formatarData(n.criadoEm)}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{n.mensagem}</p>
                {n.tipo && (
                  <span className="inline-block mt-2 text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {n.tipo.replace(/_/g, " ")}
                  </span>
                )}
              </div>

              <button
                onClick={(e) => deletar(n.notificacaoId, e)}
                className="shrink-0 text-gray-300 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50"
                title="Excluir notificação"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

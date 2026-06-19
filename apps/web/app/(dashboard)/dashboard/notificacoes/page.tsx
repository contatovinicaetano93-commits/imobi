"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  Bell,
  BellOff,
  CheckCheck,
  X,
  Info,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Building2,
  FileText,
  Megaphone,
} from "lucide-react";
import { notificacoesApi, type Notificacao } from "@/lib/api";

type Tab = "todas" | "nao-lidas";

function getNotifIcon(tipo?: string) {
  if (!tipo) return Info;
  const t = tipo.toUpperCase();
  if (t.includes("CREDITO") || t.includes("PARCELA")) return CreditCard;
  if (t.includes("OBRA") || t.includes("ETAPA"))       return Building2;
  if (t.includes("KYC") || t.includes("DOCUMENT"))     return FileText;
  if (t.includes("ALERTA") || t.includes("WARN"))      return AlertTriangle;
  if (t.includes("APROVAD") || t.includes("SUCESSO"))  return CheckCircle2;
  if (t.includes("AVISO") || t.includes("INFORM"))     return Megaphone;
  return Info;
}

function getNotifIconStyle(tipo?: string) {
  if (!tipo) return { bg: "bg-blue-50", color: "text-[#1B4FD8]" };
  const t = tipo.toUpperCase();
  if (t.includes("CREDITO") || t.includes("PARCELA")) return { bg: "bg-blue-50",   color: "text-[#1B4FD8]" };
  if (t.includes("OBRA") || t.includes("ETAPA"))      return { bg: "bg-green-50",  color: "text-[#16a34a]" };
  if (t.includes("KYC") || t.includes("DOCUMENT"))    return { bg: "bg-purple-50", color: "text-purple-600" };
  if (t.includes("ALERTA") || t.includes("WARN"))     return { bg: "bg-yellow-50", color: "text-yellow-600" };
  if (t.includes("APROVAD") || t.includes("SUCESSO")) return { bg: "bg-green-50",  color: "text-[#16a34a]" };
  return { bg: "bg-gray-50", color: "text-gray-500" };
}

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
      router.push(notificacao.link as Route);
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

  async function limparLidas() {
    await notificacoesApi.deletarLidas().catch(() => null);
    setNotificacoes((prev) => prev.filter((n) => !n.lida));
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
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl">
            <Bell className="w-6 h-6 text-[#1B4FD8]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Notificações</h1>
            <p className="text-sm text-gray-500">
              {naoLidasCount > 0
                ? `${naoLidasCount} não lida${naoLidasCount !== 1 ? "s" : ""}`
                : "Tudo em dia"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {naoLidasCount > 0 && (
            <button
              onClick={marcarTodasLidas}
              disabled={marcandoTodas}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#1B4FD8] hover:text-blue-800 disabled:opacity-50 transition-colors bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl"
            >
              <CheckCheck className="w-4 h-4" />
              {marcandoTodas ? "Marcando..." : "Marcar todas como lidas"}
            </button>
          )}
          {notificacoes.some((n) => n.lida) && (
            <button
              onClick={limparLidas}
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-red-600 transition-colors bg-gray-100 hover:bg-red-50 px-3 py-2 rounded-xl"
            >
              <X className="w-4 h-4" />
              Limpar lidas
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["todas", "nao-lidas"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
              tab === t
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "todas" ? (
              <>
                <Bell className="w-3.5 h-3.5" />
                Todas
              </>
            ) : (
              <>
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${naoLidasCount > 0 ? "bg-[#1B4FD8] text-white" : "bg-gray-200 text-gray-500"}`}>
                  {naoLidasCount}
                </span>
                Não lidas
              </>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        /* Skeleton Loaders */
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2.5 pt-0.5">
                  <div className="h-3.5 bg-gray-100 rounded-full w-2/3" />
                  <div className="h-3 bg-gray-100 rounded-full w-full" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtradas.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 flex flex-col items-center gap-4">
          <div className="p-5 bg-gray-50 rounded-2xl">
            <BellOff className="w-12 h-12 text-gray-300" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-700 mb-1">
              {tab === "nao-lidas" ? "Nenhuma notificação não lida" : "Nenhuma notificação"}
            </p>
            <p className="text-sm text-gray-400">
              {tab === "nao-lidas"
                ? "Você está em dia com tudo."
                : "Você não tem notificações ainda."}
            </p>
          </div>
        </div>
      ) : (
        /* Notification List */
        <div className="space-y-2.5">
          {filtradas.map((n) => {
            const Icon = getNotifIcon(n.tipo);
            const iconStyle = getNotifIconStyle(n.tipo);
            return (
              <div
                key={n.notificacaoId}
                onClick={() => marcarLida(n)}
                className={`bg-white rounded-2xl border shadow-sm p-5 flex items-start gap-4 transition-all duration-150 ${
                  n.link ? "cursor-pointer hover:shadow-md hover:bg-gray-50/50" : ""
                } ${n.lida ? "border-gray-100" : "border-[#1B4FD8]/20 bg-blue-50/20"}`}
              >
                {/* Icon */}
                <div className={`p-2.5 rounded-xl shrink-0 ${iconStyle.bg}`}>
                  <Icon className={`w-5 h-5 ${iconStyle.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {!n.lida && (
                        <span className="w-2 h-2 rounded-full bg-[#1B4FD8] shrink-0" />
                      )}
                      <p className={`text-sm font-semibold truncate ${n.lida ? "text-gray-600" : "text-gray-900"}`}>
                        {n.titulo}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 tabular-nums">
                      {formatarData(n.criadoEm)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{n.mensagem}</p>
                  {n.tipo && (
                    <span className="inline-flex items-center mt-2 text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {n.tipo.replace(/_/g, " ")}
                    </span>
                  )}
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => deletar(n.notificacaoId, e)}
                  className="shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all duration-150"
                  title="Excluir notificação"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

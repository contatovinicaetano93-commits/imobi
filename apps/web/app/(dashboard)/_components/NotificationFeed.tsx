"use client";
// @ts-nocheck - Next.js component type compatibility issue
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { notificacoesApi, type Notificacao } from "@/lib/api";

type NotificationFeedProps = {
  limit?: number;
};

function formatRelativeTime(date: string) {
  const now = new Date();
  const notificationDate = new Date(date);
  const diffMs = now.getTime() - notificationDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Agora";
  if (diffMins < 60) return `${diffMins}m atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;

  return notificationDate.toLocaleDateString("pt-BR");
}

function getNotificationIcon(tipo: string) {
  const icons = {
    aprovacao: "✅",
    rejeicao: "❌",
    vistoria: "📸",
    credito: "💰",
    etapa: "📋",
    kyc: "🆔",
    desembolso: "💵",
    sistema: "🔔",
  };
  return icons[tipo as keyof typeof icons] || "📌";
}

function getNotificationColor(tipo: string) {
  const colors = {
    aprovacao: "bg-green-50 border-green-200",
    rejeicao: "bg-red-50 border-red-200",
    vistoria: "bg-blue-50 border-blue-200",
    credito: "bg-purple-50 border-purple-200",
    etapa: "bg-orange-50 border-orange-200",
    kyc: "bg-indigo-50 border-indigo-200",
    desembolso: "bg-emerald-50 border-emerald-200",
    sistema: "bg-gray-50 border-gray-200",
  };
  return colors[tipo as keyof typeof colors] || "bg-gray-50 border-gray-200";
}

export function NotificationFeed({ limit = 10 }: NotificationFeedProps) {
  const [notifications, setNotifications] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    notificacoesApi
      .listar(limit, 0)
      .then((response) => setNotifications(response.notificacoes))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [limit]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificacoesApi.marcarComoLida(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notificacaoId === id ? { ...n, lida: true } : n
        )
      );
    } catch {
      // Silently fail on mark as read
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <p className="text-gray-500 text-sm">Carregando notificações...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-2xl border border-red-200 p-6">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-gray-500 text-sm">Nenhuma notificação no momento</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <div
          key={notification.notificacaoId}
          className={`rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer ${
            notification.lida
              ? "bg-white border-gray-100"
              : `${getNotificationColor(notification.tipo)} border-opacity-50`
          }`}
          onClick={() => handleMarkAsRead(notification.notificacaoId)}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0 pt-1">
              {getNotificationIcon(notification.tipo)}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p
                  className={`font-semibold text-sm ${
                    notification.lida
                      ? "text-gray-700"
                      : "text-gray-900"
                  }`}
                >
                  {notification.titulo}
                </p>
                {!notification.lida && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" />
                )}
              </div>

              <p className="text-sm text-gray-600 line-clamp-2">
                {notification.mensagem}
              </p>

              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500">
                  {formatRelativeTime(notification.criadoEm)}
                </p>

                {notification.link && (
                  <Link
                    href={notification.link}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Ver →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {notifications.length >= limit && (
        <Link
          href="/dashboard/notificacoes"
          className="block text-center py-3 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors border border-blue-200"
        >
          Ver todas as notificações →
        </Link>
      )}
    </div>
  );
}

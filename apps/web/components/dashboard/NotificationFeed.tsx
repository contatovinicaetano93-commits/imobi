"use client";

import { useEffect, useState } from "react";
import { notificacoesApi, type Notificacao } from "@/lib/api";

export function NotificationFeed({ limit }: { limit?: number }) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificacoesApi
      .listarNaoLidas()
      .then((nots) => setNotificacoes(limit ? nots.slice(0, limit) : nots))
      .finally(() => setLoading(false));
  }, [limit]);

  if (loading) {
    return <div className="bg-white rounded-lg p-4">Carregando notificações...</div>;
  }

  if (notificacoes.length === 0) {
    return <div className="bg-white rounded-lg p-4">Nenhuma notificação não lida.</div>;
  }

  return (
    <div className="space-y-2">
      {notificacoes.map((notif) => (
        <div key={notif.notificacaoId} className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="font-medium text-sm text-blue-900">{notif.titulo}</p>
          <p className="text-xs text-blue-700 mt-1">{notif.mensagem}</p>
        </div>
      ))}
    </div>
  );
}

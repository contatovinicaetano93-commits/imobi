"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Calendar, Building2, User, CheckCircle2, AlertCircle } from "lucide-react";
import { vistoriaApi, type EtapaPendenteVistoria } from "@/lib/api";

export default function GestorVistoriaPage() {
  const [etapas, setEtapas] = useState<EtapaPendenteVistoria[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [agendando, setAgendando] = useState<string | null>(null);
  const [datas, setDatas] = useState<Record<string, string>>({});
  const [obs, setObs] = useState<Record<string, string>>({});
  const [sucesso, setSucesso] = useState<Record<string, boolean>>({});
  const [erro, setErro] = useState<Record<string, string>>({});

  useEffect(() => {
    vistoriaApi
      .pendentes(20, 0)
      .then((r) => { setEtapas(r.data); setTotal(r.total); })
      .catch(() => setEtapas([]))
      .finally(() => setLoading(false));
  }, []);

  async function agendar(etapaId: string) {
    const data = datas[etapaId];
    if (!data) { setErro((p) => ({ ...p, [etapaId]: "Informe a data da vistoria." })); return; }
    setAgendando(etapaId);
    setErro((p) => ({ ...p, [etapaId]: "" }));
    try {
      await vistoriaApi.agendar(etapaId, new Date(data).toISOString(), obs[etapaId]);
      setSucesso((p) => ({ ...p, [etapaId]: true }));
      setEtapas((prev) => prev.filter((e) => e.etapaId !== etapaId));
    } catch {
      setErro((p) => ({ ...p, [etapaId]: "Erro ao agendar. Tente novamente." }));
    } finally {
      setAgendando(null);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-50 rounded-xl">
          <ClipboardList className="w-6 h-6 text-[#1B4FD8]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Agendamento de Vistorias</h1>
          <p className="text-sm text-gray-500">
            {loading ? "Carregando..." : `${total} etapa${total !== 1 ? "s" : ""} aguardando vistoria`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded-full w-1/2" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/3" />
                  <div className="h-8 bg-gray-100 rounded-lg w-full mt-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : etapas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 flex flex-col items-center gap-4">
          <div className="p-5 bg-green-50 rounded-2xl">
            <CheckCircle2 className="w-12 h-12 text-green-400" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-700 mb-1">Nenhuma vistoria pendente</p>
            <p className="text-sm text-gray-400">Todas as etapas foram vistoriadas.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {etapas.map((etapa) => (
            <div key={etapa.etapaId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-blue-50 rounded-xl shrink-0">
                  <Building2 className="w-5 h-5 text-[#1B4FD8]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{etapa.nome}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-sm text-gray-500 truncate">{etapa.obra.nome} · {etapa.obra.usuario.nome}</p>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Data da vistoria</label>
                        <input
                          type="date"
                          min={today}
                          value={datas[etapa.etapaId] ?? ""}
                          onChange={(e) => setDatas((p) => ({ ...p, [etapa.etapaId]: e.target.value }))}
                          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/30 focus:border-[#1B4FD8]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Observações (opcional)</label>
                      <input
                        type="text"
                        placeholder="Ex: Visita confirmada com o responsável..."
                        value={obs[etapa.etapaId] ?? ""}
                        onChange={(e) => setObs((p) => ({ ...p, [etapa.etapaId]: e.target.value }))}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/30 focus:border-[#1B4FD8]"
                      />
                    </div>

                    {erro[etapa.etapaId] && (
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {erro[etapa.etapaId]}
                      </div>
                    )}

                    <button
                      onClick={() => agendar(etapa.etapaId)}
                      disabled={agendando === etapa.etapaId}
                      className="inline-flex items-center gap-2 text-sm font-semibold bg-[#1B4FD8] text-white px-4 py-2 rounded-xl hover:bg-blue-800 disabled:opacity-50 transition-colors"
                    >
                      <Calendar className="w-4 h-4" />
                      {agendando === etapa.etapaId ? "Agendando..." : "Agendar Vistoria"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

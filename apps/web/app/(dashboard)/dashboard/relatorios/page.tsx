"use client";

import { useEffect, useState } from "react";
import {
  creditoApi,
  obrasApi,
  scoreApi,
  managerApi,
  usuariosApi,
  type CreditoResumo,
  type ObraResumo,
  type ScoreHistorico,
  type ManagerStats,
  type UsuarioPerfil,
} from "@/lib/api";

function brl(v: number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    AGUARDANDO_VISTORIA: "Aguardando Vistoria",
    EM_ANALISE: "Em Análise",
    APROVADA: "Aprovada",
    REJEITADA: "Rejeitada",
    LIBERACAO_AGENDADA: "Lib. Agendada",
    LIBERADA: "Liberada",
    PENDENTE: "Pendente",
    PROCESSADA: "Processada",
    FALHOU: "Falhou",
  };
  return map[status] ?? status;
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    APROVADA: "bg-green-100 text-green-800",
    LIBERADA: "bg-green-100 text-green-800",
    PROCESSADA: "bg-green-100 text-green-800",
    REJEITADA: "bg-red-100 text-red-800",
    FALHOU: "bg-red-100 text-red-800",
    AGUARDANDO_VISTORIA: "bg-yellow-100 text-yellow-800",
    EM_ANALISE: "bg-blue-100 text-blue-800",
    PENDENTE: "bg-gray-100 text-gray-800",
  };
  return map[status] ?? "bg-gray-100 text-gray-800";
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg">
      {msg}
    </div>
  );
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob(["﻿" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function RelatoriosPage() {
  const [creditos, setCreditos] = useState<CreditoResumo[]>([]);
  const [obras, setObras] = useState<ObraResumo[]>([]);
  const [historico, setHistorico] = useState<ScoreHistorico[]>([]);
  const [stats, setStats] = useState<ManagerStats | null>(null);
  const [usuario, setUsuario] = useState<UsuarioPerfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      creditoApi.meus().catch(() => [] as CreditoResumo[]),
      obrasApi.listar().catch(() => [] as ObraResumo[]),
      scoreApi.historico(12).catch(() => [] as ScoreHistorico[]),
      usuariosApi.meuPerfil().catch(() => null),
    ])
      .then(([c, o, h, u]) => {
        setCreditos(c);
        setObras(o);
        setHistorico(h);
        setUsuario(u);
        if (u?.tipo === "ADMIN" || u?.tipo === "GESTOR_OBRA") {
          return managerApi.dashboard().catch(() => null);
        }
        return null;
      })
      .then((s) => {
        if (s) setStats(s);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalAprovado = creditos.reduce((acc, c) => acc + Number(c.valorAprovado), 0);
  const totalLiberado = creditos.reduce((acc, c) => acc + Number(c.valorLiberado), 0);
  const obrasAtivas = obras.filter((o) => o.status === "EM_ANDAMENTO" || o.status === "EM_EXECUCAO").length;

  const todasLiberacoes = creditos.flatMap((c) =>
    (c.liberacoes ?? []).map((l) => ({
      ...l,
      obraNome: c.obras?.[0]?.nome ?? "—",
    }))
  );

  const maxScore = Math.max(...historico.map((h) => h.score), 1);

  const isGestor = usuario?.tipo === "ADMIN" || usuario?.tipo === "GESTOR_OBRA";

  function handleExport(fmt: string) {
    const now = new Date().toISOString().slice(0, 10);

    if (fmt === "CSV" || fmt === "Excel") {
      const isExcel = fmt === "Excel";
      const sep = isExcel ? "\t" : ",";
      const q = (v: unknown) => isExcel ? String(v ?? "") : `"${String(v ?? "").replace(/"/g, '""')}"`;

      const lines: string[] = [];

      // Summary section
      lines.push(["Resumo Financeiro", "", ""].join(sep));
      lines.push([q("Crédito Total Aprovado"), q(totalAprovado.toFixed(2)), "R$"].join(sep));
      lines.push([q("Crédito Total Liberado"), q(totalLiberado.toFixed(2)), "R$"].join(sep));
      lines.push([q("Obras Ativas"), q(obrasAtivas), ""].join(sep));
      lines.push("");

      // Liberações
      if (todasLiberacoes.length > 0) {
        lines.push(["Timeline de Liberações", "", "", ""].join(sep));
        lines.push([q("Data"), q("Obra"), q("Valor (R$)"), q("Status")].join(sep));
        for (const l of todasLiberacoes) {
          lines.push([
            q(l.processadoEm ? formatDate(l.processadoEm) : "—"),
            q(l.obraNome),
            q(l.valor.toFixed(2)),
            q(getStatusLabel(l.status)),
          ].join(sep));
        }
        lines.push("");
      }

      // Score history
      if (historico.length > 0) {
        lines.push(["Score ao Longo do Tempo", ""].join(sep));
        lines.push([q("Data"), q("Score"), q("Motivo")].join(sep));
        for (const h of historico) {
          lines.push([q(formatDate(h.criadoEm)), q(h.score), q(h.motivo ?? "")].join(sep));
        }
      }

      const content = lines.join("\n");
      const mime = isExcel ? "application/vnd.ms-excel" : "text/csv;charset=utf-8;";
      const ext = isExcel ? "xls" : "csv";
      downloadBlob(content, `relatorio-imobi-${now}.${ext}`, mime);
      setToast(`Relatório ${fmt} gerado com sucesso`);
    } else if (fmt === "PDF") {
      window.print();
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-2xl font-bold text-gray-900">Relatórios</p>
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-sm text-gray-500 mt-1">Análise financeira e operacional</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 mb-2">Exportar Relatório</h2>
        <p className="text-xs text-gray-400 mb-4">CSV e Excel baixam imediatamente. PDF abre a janela de impressão do navegador.</p>
        <div className="flex flex-wrap gap-3">
          {["PDF", "Excel", "CSV"].map((fmt) => (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 font-semibold text-sm rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {fmt}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 mb-5">Resumo Financeiro</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
            <p className="text-sm text-gray-600 mb-1">Crédito Total Aprovado</p>
            <p className="text-2xl font-bold text-blue-700">{brl(totalAprovado)}</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-100 p-5">
            <p className="text-sm text-gray-600 mb-1">Crédito Total Liberado</p>
            <p className="text-2xl font-bold text-green-700">{brl(totalLiberado)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-5">
            <p className="text-sm text-gray-600 mb-1">Obras Ativas</p>
            <p className="text-2xl font-bold text-gray-900">{obrasAtivas}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 mb-5">Timeline de Liberações</h2>
        {todasLiberacoes.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma liberação registrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-gray-500 font-semibold pb-3 pr-4">Data</th>
                  <th className="text-left text-gray-500 font-semibold pb-3 pr-4">Obra</th>
                  <th className="text-left text-gray-500 font-semibold pb-3 pr-4">Valor</th>
                  <th className="text-left text-gray-500 font-semibold pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {todasLiberacoes.map((lib) => (
                  <tr key={lib.id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4 text-gray-700">
                      {lib.processadoEm ? formatDate(lib.processadoEm) : "—"}
                    </td>
                    <td className="py-3 pr-4 font-medium text-gray-900">{lib.obraNome}</td>
                    <td className="py-3 pr-4 font-semibold text-gray-900">{brl(lib.valor)}</td>
                    <td className="py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStatusBadge(lib.status)}`}>
                        {getStatusLabel(lib.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 mb-5">Score ao Longo do Tempo</h2>
        {historico.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum dado de score disponível.</p>
        ) : (
          <div className="space-y-2">
            {historico.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20 shrink-0">
                  {formatDate(item.criadoEm)}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                  <div
                    className="h-full bg-[#16a34a] rounded-full transition-all flex items-center justify-end pr-2"
                    style={{ width: `${Math.max(4, (item.score / maxScore) * 100)}%` }}
                  >
                    <span className="text-xs font-bold text-white">{item.score}</span>
                  </div>
                </div>
                <span className="text-xs text-gray-500 w-32 shrink-0 truncate">{item.motivo}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {isGestor && stats && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-5">Etapas por Status</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-gray-500 font-semibold pb-3 pr-4">Status</th>
                  <th className="text-left text-gray-500 font-semibold pb-3">Quantidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <tr className="hover:bg-gray-50">
                  <td className="py-3 pr-4">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800">
                      Aguardando Vistoria
                    </span>
                  </td>
                  <td className="py-3 font-bold text-gray-900">{stats.filaAprovacoes}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-3 pr-4">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800">
                      KYC Pendente
                    </span>
                  </td>
                  <td className="py-3 font-bold text-gray-900">{stats.filaKyc}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-3 pr-4">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
                      Créditos Ativos
                    </span>
                  </td>
                  <td className="py-3 font-bold text-gray-900">{stats.creditosAtivos}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-3 pr-4">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                      Obras em Execução
                    </span>
                  </td>
                  <td className="py-3 font-bold text-gray-900">{stats.obrasAtivas}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

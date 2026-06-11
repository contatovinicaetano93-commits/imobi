"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type EtapaStatus = "PLANEJADA" | "EM_EXECUCAO" | "AGUARDANDO_VISTORIA" | "CONCLUIDA";

type Etapa = {
  id: string;
  nome: string;
  ordem: number;
  status: EtapaStatus;
  valorLiberacao: number;
};

type Obra = {
  id: string;
  nome: string;
  status: string;
  endereco?: string;
  progresso?: number;
  etapaAtual?: string;
  proximaLiberacao?: number;
  etapas?: Etapa[];
};

const DEMO_OBRAS: Obra[] = [
  {
    id: "d1",
    nome: "Residencial Vila Nova — Casa 12",
    status: "EM_EXECUCAO",
    endereco: "R. das Flores, 123 — SP",
    progresso: 65,
    etapaAtual: "Estrutura",
    proximaLiberacao: 120_000,
    etapas: [
      { id: "e1", nome: "Fundação", ordem: 1, status: "CONCLUIDA", valorLiberacao: 80_000 },
      { id: "e2", nome: "Estrutura", ordem: 2, status: "AGUARDANDO_VISTORIA", valorLiberacao: 120_000 },
      { id: "e3", nome: "Alvenaria", ordem: 3, status: "PLANEJADA", valorLiberacao: 95_000 },
      { id: "e4", nome: "Cobertura", ordem: 4, status: "PLANEJADA", valorLiberacao: 75_000 },
    ],
  },
  {
    id: "d2",
    nome: "Sobrado Jardim das Acácias",
    status: "EM_EXECUCAO",
    endereco: "Av. Principal, 456 — SP",
    progresso: 30,
    etapaAtual: "Fundação",
    proximaLiberacao: 96_000,
    etapas: [
      { id: "e5", nome: "Fundação", ordem: 1, status: "EM_EXECUCAO", valorLiberacao: 96_000 },
      { id: "e6", nome: "Estrutura", ordem: 2, status: "PLANEJADA", valorLiberacao: 110_000 },
      { id: "e7", nome: "Alvenaria", ordem: 3, status: "PLANEJADA", valorLiberacao: 88_000 },
    ],
  },
];

const STATUS_LABEL: Record<string, string> = {
  PLANEJADA: "Planejada",
  EM_EXECUCAO: "Em execução",
  AGUARDANDO_VISTORIA: "Aguardando vistoria",
  CONCLUIDA: "Concluída",
};

const STATUS_CLASSES: Record<string, string> = {
  PLANEJADA: "bg-gray-100 text-gray-600",
  EM_EXECUCAO: "bg-blue-100 text-blue-700",
  AGUARDANDO_VISTORIA: "bg-amber-100 text-amber-700",
  CONCLUIDA: "bg-green-100 text-green-700",
};

const STATUS_DOT: Record<string, string> = {
  PLANEJADA: "bg-gray-400",
  EM_EXECUCAO: "bg-[#1B4FD8]",
  AGUARDANDO_VISTORIA: "bg-amber-500",
  CONCLUIDA: "bg-[#16a34a]",
};

function obrasStatusLabel(status: string): { label: string; cls: string } {
  if (status === "EM_EXECUCAO") return { label: "Em execução", cls: "bg-blue-100 text-blue-700" };
  if (status === "CONCLUIDA") return { label: "Concluída", cls: "bg-green-100 text-green-700" };
  return { label: "Planejamento", cls: "bg-gray-100 text-gray-600" };
}

function normalizeEtapas(raw: unknown[]): Etapa[] {
  return raw.map((e) => {
    const r = e as Record<string, unknown>;
    return {
      id: String(r["id"] ?? ""),
      nome: String(r["nome"] ?? ""),
      ordem: Number(r["ordem"] ?? 0),
      status: String(r["status"] ?? "PLANEJADA") as EtapaStatus,
      valorLiberacao: Number(r["valorLiberacao"] ?? 0),
    };
  });
}

function normalizeObras(raw: unknown[]): Obra[] {
  return raw.map((o) => {
    const r = o as Record<string, unknown>;
    const etapasRaw = Array.isArray(r["etapas"]) ? (r["etapas"] as unknown[]) : [];
    return {
      id: String(r["id"] ?? ""),
      nome: String(r["nome"] ?? ""),
      status: String(r["status"] ?? ""),
      endereco: r["endereco"] ? String(r["endereco"]) : undefined,
      progresso: r["progresso"] !== undefined ? Number(r["progresso"]) : undefined,
      etapaAtual: r["etapaAtual"] ? String(r["etapaAtual"]) : undefined,
      proximaLiberacao: r["proximaLiberacao"] ? Number(r["proximaLiberacao"]) : undefined,
      etapas: normalizeEtapas(etapasRaw),
    };
  });
}

export default function ConstrutorPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    fetch("/api/proxy/obras")
      .then((r) => {
        if (!r.ok) throw new Error("api-error");
        return r.json() as Promise<unknown[]>;
      })
      .then((data) => {
        const normalized = normalizeObras(Array.isArray(data) ? data : []);
        if (normalized.length === 0) {
          setObras(DEMO_OBRAS);
          setIsDemo(true);
        } else {
          setObras(normalized);
        }
      })
      .catch(() => {
        setObras(DEMO_OBRAS);
        setIsDemo(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const obrasAndamento = obras.filter((o) => o.status === "EM_EXECUCAO");
  const todasEtapas: Etapa[] = obras.flatMap((o) => o.etapas ?? []);
  const etapasConcluidas = todasEtapas.filter((e) => e.status === "CONCLUIDA").length;
  const etapasPendentes = todasEtapas.filter(
    (e) => e.status === "PLANEJADA" || e.status === "EM_EXECUCAO"
  );
  const valorAReceber = etapasPendentes.reduce((sum, e) => sum + e.valorLiberacao, 0);
  const proximaEtapa = todasEtapas.find((e) => e.status === "AGUARDANDO_VISTORIA");

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portal do Construtor</h1>
          <p className="text-sm text-gray-500 mt-1">Carregando...</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-500">Carregando seu painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portal do Construtor</h1>
          <p className="text-sm text-gray-500 mt-1">
            Acompanhe suas obras, etapas e liberações de pagamento
          </p>
        </div>
        {isDemo && (
          <span className="inline-block text-xs font-medium bg-amber-100 text-amber-700 px-3 py-1 rounded-full self-start sm:self-center">
            Dados demonstrativos
          </span>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#F0F5FF] rounded-2xl border border-blue-200 p-5">
          <p className="text-xs text-gray-600 mb-2">Obras em andamento</p>
          <p className="text-3xl font-bold text-[#1B4FD8]">{obrasAndamento.length}</p>
          <p className="text-xs text-gray-500 mt-1">de {obras.length} obras</p>
        </div>

        <div className="bg-green-50 rounded-2xl border border-green-200 p-5">
          <p className="text-xs text-gray-600 mb-2">Valor a receber</p>
          <p className="text-xl font-bold text-[#16a34a] leading-tight">{brl(valorAReceber)}</p>
          <p className="text-xs text-gray-500 mt-1">etapas pendentes</p>
        </div>

        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
          <p className="text-xs text-gray-600 mb-2">Etapas concluídas</p>
          <p className="text-3xl font-bold text-gray-700">{etapasConcluidas}</p>
          <p className="text-xs text-gray-500 mt-1">de {todasEtapas.length} etapas</p>
        </div>

        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
          <p className="text-xs text-gray-600 mb-2">Próxima liberação</p>
          {proximaEtapa ? (
            <>
              <p className="text-xl font-bold text-amber-700 leading-tight">
                {brl(proximaEtapa.valorLiberacao)}
              </p>
              <p className="text-xs text-gray-500 mt-1 truncate">{proximaEtapa.nome}</p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold text-gray-400">—</p>
              <p className="text-xs text-gray-500 mt-1">nenhuma aguardando</p>
            </>
          )}
        </div>
      </div>

      {/* Obras e etapas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Obras e Etapas</h2>
          <Link
            href="/dashboard/obras"
            className="text-sm font-semibold text-[#1B4FD8] hover:text-blue-800"
          >
            Ver todas
          </Link>
        </div>

        {obras.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <p className="text-gray-600 mb-4">Nenhuma obra registrada</p>
          </div>
        ) : (
          <div className="space-y-4">
            {obras.map((obra) => {
              const { label, cls } = obrasStatusLabel(obra.status);
              return (
                <div
                  key={obra.id}
                  className="bg-white rounded-2xl border border-gray-100 p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-5">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900">{obra.nome}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {obra.endereco ?? "Local não informado"}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 self-start ${cls}`}
                    >
                      {label}
                    </span>
                  </div>

                  {obra.progresso !== undefined && (
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-gray-600">Progresso geral</span>
                        <span className="text-xs font-bold text-gray-900">{obra.progresso}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-[#1B4FD8] h-2 rounded-full transition-all"
                          style={{ width: `${obra.progresso}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {obra.etapas && obra.etapas.length > 0 && (
                    <div className="mb-5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Pipeline de etapas
                      </p>
                      <div className="space-y-2">
                        {obra.etapas
                          .slice()
                          .sort((a, b) => a.ordem - b.ordem)
                          .map((etapa) => (
                            <div
                              key={etapa.id}
                              className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[etapa.status] ?? "bg-gray-400"}`}
                                />
                                <span className="text-sm text-gray-700 truncate">{etapa.nome}</span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs font-medium text-gray-600">
                                  {brl(etapa.valorLiberacao)}
                                </span>
                                <span
                                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_CLASSES[etapa.status] ?? "bg-gray-100 text-gray-600"}`}
                                >
                                  {STATUS_LABEL[etapa.status] ?? etapa.status}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Ações rápidas da obra */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    {obra.etapas
                      ?.filter((e) => e.status === "EM_EXECUCAO" || e.status === "AGUARDANDO_VISTORIA")
                      .slice(0, 1)
                      .map((etapa) => (
                        <Link
                          key={etapa.id}
                          href={`/dashboard/obras/${obra.id}/vistoria/${etapa.id}`}
                          className="text-xs font-semibold text-white bg-[#1B4FD8] hover:bg-blue-800 px-4 py-2 rounded-lg transition-colors"
                        >
                          Enviar evidência
                        </Link>
                      ))}
                    <Link
                      href={`/dashboard/obras/${obra.id}`}
                      className="text-xs font-semibold text-[#1B4FD8] border border-[#1B4FD8] hover:bg-[#F0F5FF] px-4 py-2 rounded-lg transition-colors"
                    >
                      Ver obra completa
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ações rápidas globais */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/dashboard/obras"
            className="flex items-center justify-between p-4 bg-[#F0F5FF] hover:bg-blue-100 rounded-xl transition-colors border border-blue-200"
          >
            <span className="text-sm font-medium text-[#1B4FD8]">Todas as obras</span>
            <span className="text-xs font-semibold text-[#1B4FD8]">{obras.length}</span>
          </Link>
          <Link
            href="/dashboard/perfil"
            className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
          >
            <span className="text-sm font-medium text-gray-700">Documentação e licenças</span>
            <span className="text-xs text-gray-500">Perfil</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

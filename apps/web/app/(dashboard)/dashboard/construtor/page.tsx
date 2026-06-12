"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  Wallet,
  Layers,
  ArrowRight,
  Camera,
  ChevronRight,
  TrendingUp,
  MapPin,
} from "lucide-react";

// ─── Formatters ────────────────────────────────────────────────────────────

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Types ─────────────────────────────────────────────────────────────────

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

type Credito = {
  creditoAprovado: number;
  creditoLiberado: number;
  proximaLiberacao?: number;
  proximaLiberacaoData?: string;
};

type UserMe = {
  nome?: string;
  name?: string;
  kycStatus?: string;
};

// ─── Demo Data ─────────────────────────────────────────────────────────────

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

const DEMO_CREDITO: Credito = {
  creditoAprovado: 800_000,
  creditoLiberado: 176_000,
  proximaLiberacao: 120_000,
  proximaLiberacaoData: "Estimada após vistoria",
};

// ─── Status Maps ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PLANEJADA: "Planejada",
  EM_EXECUCAO: "Em execução",
  AGUARDANDO_VISTORIA: "Aguardando vistoria",
  CONCLUIDA: "Concluída",
};

const STATUS_BADGE: Record<string, string> = {
  PLANEJADA: "bg-gray-100 text-gray-600",
  EM_EXECUCAO: "bg-cyan-100 text-cyan-700",
  AGUARDANDO_VISTORIA: "bg-amber-100 text-amber-700",
  CONCLUIDA: "bg-green-100 text-green-700",
};

const STATUS_DOT: Record<string, string> = {
  PLANEJADA: "bg-gray-300",
  EM_EXECUCAO: "bg-[#0891b2]",
  AGUARDANDO_VISTORIA: "bg-amber-500",
  CONCLUIDA: "bg-green-500",
};

// ─── Normalizers ───────────────────────────────────────────────────────────

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

// ─── KYC Badge ─────────────────────────────────────────────────────────────

function KycBadge({ status }: { status: string }) {
  if (status === "APROVADO") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-green-100 text-green-700 px-3 py-1.5 rounded-full">
        <CheckCircle2 className="w-3.5 h-3.5" />
        KYC Aprovado
      </span>
    );
  }
  return (
    <Link
      href="/dashboard/kyc"
      className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full hover:bg-amber-200 transition-colors"
    >
      <AlertTriangle className="w-3.5 h-3.5" />
      {status === "PENDENTE"
        ? "KYC Pendente"
        : status === "EM_ANALISE"
        ? "KYC em análise"
        : "KYC não aprovado"}
      <ChevronRight className="w-3 h-3" />
    </Link>
  );
}

// ─── Next Action Card ──────────────────────────────────────────────────────

type EtapaComObra = Etapa & { obraId: string; obraNome: string };

function ProximaAcaoCard({
  obras,
  kycStatus,
}: {
  obras: Obra[];
  kycStatus: string;
}) {
  const todasEtapas: EtapaComObra[] = obras.flatMap((o) =>
    (o.etapas ?? []).map((e) => ({ ...e, obraId: o.id, obraNome: o.nome }))
  );

  const etapaAguardando = todasEtapas.find((e) => e.status === "AGUARDANDO_VISTORIA");
  const etapaEmExecucao = todasEtapas.find((e) => e.status === "EM_EXECUCAO");

  if (kycStatus !== "APROVADO") {
    return (
      <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-200 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-0.5">
              Ação necessária
            </p>
            <p className="font-semibold text-amber-900">
              Complete sua verificação de identidade
            </p>
            <p className="text-sm text-amber-700 mt-0.5">
              Seu KYC precisa ser aprovado para liberar crédito nas obras.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/kyc"
          className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 px-4 py-2.5 rounded-xl transition-colors shrink-0"
        >
          Verificar identidade
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  if (etapaAguardando) {
    return (
      <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-200 flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5 text-amber-700" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-0.5">
              Próxima ação
            </p>
            <p className="font-semibold text-amber-900">
              Envie as fotos da etapa{" "}
              <span className="text-amber-700">{etapaAguardando.nome}</span>
            </p>
            <p className="text-sm text-amber-700 mt-0.5 truncate">
              Obra: {etapaAguardando.obraNome} &middot;{" "}
              {brl(etapaAguardando.valorLiberacao)} a liberar
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard/obras/${etapaAguardando.obraId}/vistoria/${etapaAguardando.id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 px-4 py-2.5 rounded-xl transition-colors shrink-0"
        >
          Enviar evidência
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  if (etapaEmExecucao) {
    return (
      <div className="bg-cyan-50 border-2 border-cyan-300 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-cyan-200 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-cyan-700" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-cyan-600 uppercase tracking-wide mb-0.5">
              Em andamento
            </p>
            <p className="font-semibold text-cyan-900">
              Sua obra{" "}
              <span className="text-cyan-700">{etapaEmExecucao.obraNome}</span>{" "}
              está em andamento
            </p>
            <p className="text-sm text-cyan-700 mt-0.5">
              Etapa atual: {etapaEmExecucao.nome}
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard/obras/${etapaEmExecucao.obraId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-[#0891b2] hover:bg-cyan-700 px-4 py-2.5 rounded-xl transition-colors shrink-0"
        >
          Ver obra
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return null;
}

// ─── Obra Card ─────────────────────────────────────────────────────────────

function ObraCard({ obra }: { obra: Obra }) {
  const etapasOrdenadas = [...(obra.etapas ?? [])].sort((a, b) => a.ordem - b.ordem);
  const etapaAcao = etapasOrdenadas.find(
    (e) => e.status === "AGUARDANDO_VISTORIA" || e.status === "EM_EXECUCAO"
  );
  const progresso = obra.progresso ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-cyan-200 transition-colors">
      {/* Header da obra */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 truncate">{obra.nome}</h3>
          {obra.endereco && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
              <p className="text-sm text-gray-500 truncate">{obra.endereco}</p>
            </div>
          )}
        </div>
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 self-start ${
            obra.status === "EM_EXECUCAO"
              ? "bg-cyan-100 text-cyan-700"
              : obra.status === "CONCLUIDA"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {obra.status === "EM_EXECUCAO"
            ? "Em execução"
            : obra.status === "CONCLUIDA"
            ? "Concluída"
            : "Planejamento"}
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-600">Progresso geral</span>
          <span className="text-xs font-bold text-gray-900">{progresso}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className="bg-[#0891b2] h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, progresso)}%` }}
          />
        </div>
        {obra.etapaAtual && (
          <p className="text-xs text-gray-500 mt-1">Etapa atual: {obra.etapaAtual}</p>
        )}
      </div>

      {/* Pipeline de etapas */}
      {etapasOrdenadas.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Pipeline de etapas
          </p>
          <div className="space-y-0.5">
            {etapasOrdenadas.map((etapa) => (
              <div
                key={etapa.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      STATUS_DOT[etapa.status] ?? "bg-gray-400"
                    }`}
                  />
                  <span className="text-sm text-gray-700 truncate">{etapa.nome}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-medium text-gray-500 hidden sm:block">
                    {brl(etapa.valorLiberacao)}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      STATUS_BADGE[etapa.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {STATUS_LABEL[etapa.status] ?? etapa.status}
                  </span>
                  {etapa.status === "AGUARDANDO_VISTORIA" && (
                    <Link
                      href={`/dashboard/obras/${obra.id}/vistoria/${etapa.id}`}
                      className="text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      Enviar evidência
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ações da obra */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
        {etapaAcao && etapaAcao.status === "AGUARDANDO_VISTORIA" && (
          <Link
            href={`/dashboard/obras/${obra.id}/vistoria/${etapaAcao.id}`}
            className="text-xs font-semibold text-white bg-[#0891b2] hover:bg-cyan-700 px-4 py-2 rounded-lg transition-colors"
          >
            Enviar evidência
          </Link>
        )}
        <Link
          href={`/dashboard/obras/${obra.id}`}
          className="text-xs font-semibold text-[#0891b2] border border-[#0891b2] hover:bg-cyan-50 px-4 py-2 rounded-lg transition-colors"
        >
          Ver obra completa
        </Link>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function ConstrutorPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [credito, setCredito] = useState<Credito | null>(null);
  const [user, setUser] = useState<UserMe | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [isDemoCredito, setIsDemoCredito] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) return null;
        return r.json() as Promise<UserMe>;
      })
      .catch(() => null);

    const fetchObras = fetch("/api/proxy/obras")
      .then((r) => {
        if (!r.ok) throw new Error("api-error");
        return r.json() as Promise<unknown>;
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const normalized = normalizeObras(list);
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
      });

    const fetchCredito = fetch("/api/proxy/credito/meus")
      .then((r) => {
        if (!r.ok) throw new Error("api-error");
        return r.json() as Promise<Credito>;
      })
      .then((data) => {
        if (data && typeof data === "object" && "creditoAprovado" in data) {
          setCredito(data as Credito);
        } else {
          setCredito(DEMO_CREDITO);
          setIsDemoCredito(true);
        }
      })
      .catch(() => {
        setCredito(DEMO_CREDITO);
        setIsDemoCredito(true);
      });

    Promise.all([fetchUser, fetchObras, fetchCredito])
      .then(([userData]) => {
        if (userData) setUser(userData as UserMe);
      })
      .finally(() => setLoading(false));
  }, []);

  const userName = user?.nome ?? user?.name ?? null;
  const kycStatus = user?.kycStatus ?? "PENDENTE";

  const obrasAndamento = obras.filter((o) => o.status === "EM_EXECUCAO");
  const todasEtapas: Etapa[] = obras.flatMap((o) => o.etapas ?? []);
  const etapasConcluidas = todasEtapas.filter((e) => e.status === "CONCLUIDA").length;
  const etapaAguardandoVistoria = todasEtapas.find((e) => e.status === "AGUARDANDO_VISTORIA");
  const valorALiberar = todasEtapas
    .filter((e) => e.status === "AGUARDANDO_VISTORIA")
    .reduce((sum, e) => sum + e.valorLiberacao, 0);

  const creditoPct =
    credito && credito.creditoAprovado > 0
      ? Math.min(100, (credito.creditoLiberado / credito.creditoAprovado) * 100)
      : 0;

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="space-y-4">
          <div className="h-8 w-48 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Hero Section ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {isDemo && (
              <span className="inline-block text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full mb-2">
                Dados demonstrativos
              </span>
            )}
            <h1 className="text-2xl font-bold text-gray-900">
              {userName
                ? `Olá, ${userName.split(" ")[0]}`
                : "Portal do Construtor"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Acompanhe suas obras, etapas e liberações de crédito
            </p>
          </div>
          <div className="shrink-0 self-start">
            <KycBadge status={kycStatus} />
          </div>
        </div>
      </div>

      {/* ── 4 KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Obras em andamento */}
        <div className="bg-cyan-50 rounded-2xl border border-cyan-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-[#0891b2]" />
            <p className="text-xs text-gray-600">Obras em andamento</p>
          </div>
          <p className="text-3xl font-bold text-[#0891b2]">{obrasAndamento.length}</p>
          <p className="text-xs text-gray-500 mt-1">de {obras.length} obra{obras.length !== 1 ? "s" : ""}</p>
        </div>

        {/* Valor a liberar */}
        <div className="bg-green-50 rounded-2xl border border-green-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-green-600" />
            <p className="text-xs text-gray-600">Valor a liberar</p>
          </div>
          <p className="text-xl font-bold text-green-600 leading-tight">{brl(valorALiberar)}</p>
          <p className="text-xs text-gray-500 mt-1">etapas em vistoria</p>
        </div>

        {/* Etapas concluídas */}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-gray-600" />
            <p className="text-xs text-gray-600">Etapas concluídas</p>
          </div>
          <p className="text-3xl font-bold text-gray-700">{etapasConcluidas}</p>
          <p className="text-xs text-gray-500 mt-1">de {todasEtapas.length} etapa{todasEtapas.length !== 1 ? "s" : ""}</p>
        </div>

        {/* Próxima liberação */}
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <p className="text-xs text-gray-600">Próxima liberação</p>
          </div>
          {etapaAguardandoVistoria ? (
            <>
              <p className="text-xl font-bold text-amber-700 leading-tight">
                {brl(etapaAguardandoVistoria.valorLiberacao)}
              </p>
              <p className="text-xs text-gray-500 mt-1 truncate">
                {etapaAguardandoVistoria.nome}
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-300">—</p>
              <p className="text-xs text-gray-400 mt-1">nenhuma aguardando</p>
            </>
          )}
        </div>
      </div>

      {/* ── Próxima Ação Obrigatória ── */}
      <ProximaAcaoCard obras={obras} kycStatus={kycStatus} />

      {/* ── Obras em Andamento ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Obras em andamento</h2>
          <Link
            href="/dashboard/obras"
            className="text-sm font-semibold text-[#0891b2] hover:text-cyan-700 flex items-center gap-1"
          >
            Ver todas
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {obras.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium mb-1">Nenhuma obra registrada</p>
            <p className="text-sm text-gray-400 mb-4">
              Comece cadastrando sua primeira obra para acompanhar o progresso.
            </p>
            <Link
              href="/dashboard/obras/nova"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0891b2] hover:underline"
            >
              Registrar primeira obra
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {obras.map((obra) => (
              <ObraCard key={obra.id} obra={obra} />
            ))}
          </div>
        )}
      </div>

      {/* ── Resumo Financeiro ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#0891b2]" />
            <h2 className="font-bold text-gray-900">Resumo financeiro</h2>
          </div>
          {isDemoCredito && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              demonstrativo
            </span>
          )}
        </div>

        {credito ? (
          <>
            {/* Crédito aprovado vs liberado */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-gray-600">Crédito aprovado</span>
                <span className="text-sm font-bold text-gray-900">
                  {brl(credito.creditoAprovado)}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 mb-1.5">
                <div
                  className="bg-[#0891b2] h-3 rounded-full transition-all duration-500"
                  style={{ width: `${creditoPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Liberado:{" "}
                  <span className="font-semibold text-gray-700">
                    {brl(credito.creditoLiberado)}
                  </span>
                </span>
                <span className="text-xs text-gray-500">
                  {creditoPct.toFixed(1)}% utilizado
                </span>
              </div>
            </div>

            {/* Próxima liberação estimada */}
            {credito.proximaLiberacao !== undefined && credito.proximaLiberacao > 0 && (
              <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-4 mb-5">
                <p className="text-xs text-cyan-600 font-semibold uppercase tracking-wide mb-1">
                  Próxima liberação estimada
                </p>
                <p className="text-2xl font-bold text-[#0891b2]">
                  {brl(credito.proximaLiberacao)}
                </p>
                {credito.proximaLiberacaoData && (
                  <p className="text-xs text-gray-500 mt-1">{credito.proximaLiberacaoData}</p>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500 py-4 text-center">
            Dados de crédito não disponíveis.
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
          <Link
            href="/dashboard/credito"
            className="text-xs font-semibold text-[#0891b2] border border-[#0891b2] hover:bg-cyan-50 px-4 py-2 rounded-lg transition-colors"
          >
            Ver crédito completo
          </Link>
          <Link
            href="/dashboard/simulador"
            className="text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors"
          >
            Simulador
          </Link>
        </div>
      </div>
    </div>
  );
}

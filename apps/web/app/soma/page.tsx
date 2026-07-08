"use client";

import { useState } from "react";
import {
  Home,
  HardHat,
  FileCheck2,
  Calculator,
  Menu as MenuIcon,
  CreditCard,
  ShieldCheck,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  CircleCheck,
  Clock,
  FileText,
  Bell,
} from "lucide-react";
import { SomaShell, type SomaNavItem } from "@/components/soma/SomaShell";
import {
  Badge,
  Card,
  CardTitle,
  Eyebrow,
  GoldButton,
  Money,
  StatRow,
} from "@/components/soma/ui";

const NAV: SomaNavItem[] = [
  { id: "inicio", label: "Início", icon: Home },
  { id: "operacao", label: "Operação", icon: HardHat },
  { id: "documentos", label: "Documentos", icon: FileCheck2 },
  { id: "viabilidade", label: "Viabilidade", icon: Calculator },
  { id: "menu", label: "Menu", icon: MenuIcon },
];

const MENU = [
  { id: "inicio", label: "Início", icon: Home },
  { id: "operacao", label: "Minha operação", icon: HardHat },
  { id: "documentos", label: "Documentos (KYC)", icon: FileCheck2 },
  { id: "viabilidade", label: "Viabilidade", icon: Calculator },
  { id: "extrato", label: "Extrato de liberações", icon: FileText },
  { id: "notificacoes", label: "Notificações", icon: Bell },
];

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
      <div
        className="h-full rounded-full bg-gold-grad"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

/* ── Início ──────────────────────────────────────────────────────────── */

function Inicio() {
  return (
    <>
      {/* Hero — crédito aprovado */}
      <Card
        glow
        className="relative overflow-hidden border-soma-gold/25 bg-soma-surface"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-gold-soft blur-2xl" />
        <div className="relative">
          <Eyebrow>Crédito aprovado</Eyebrow>
          <div className="mt-2">
            <Money value={420000} size="xl" />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate font-sans text-sm font-semibold text-soma-text">
                Residencial Vista Verde
              </p>
              <p className="font-sans text-xs text-soma-muted">
                Obra em andamento · etapa 3 de 6
              </p>
            </div>
            <Badge tone="gain">
              <CircleCheck size={13} /> Ativa
            </Badge>
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between font-sans text-xs">
              <span className="text-soma-muted">Liberado</span>
              <span className="font-num font-semibold tabular-nums text-soma-text">
                R$ 168.000 / R$ 420.000
              </span>
            </div>
            <ProgressBar pct={40} />
          </div>
        </div>
      </Card>

      {/* Próximo passo (jornada) */}
      <Card className="border-soma-gold/20 bg-gold-soft">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-soma-gold/15 text-soma-gold">
            <Clock size={17} />
          </span>
          <div className="flex-1">
            <p className="font-sans text-sm font-bold text-soma-text">
              Seu próximo passo
            </p>
            <p className="mt-0.5 font-sans text-xs leading-relaxed text-soma-muted">
              Envie a foto da etapa concluída para liberar a próxima parcela da
              obra.
            </p>
            <div className="mt-3">
              <GoldButton icon={HardHat}>Registrar etapa</GoldButton>
            </div>
          </div>
        </div>
      </Card>

      {/* Status da conta */}
      <Card>
        <div className="-my-1 divide-y divide-soma-line/60">
          <StatRow
            icon={ShieldCheck}
            label="Documentos (KYC)"
            value="Verificado"
            tone="ok"
          />
          <StatRow
            icon={Calculator}
            label="Viabilidade"
            value="Aprovada · 92 pontos"
            tone="ok"
          />
          <StatRow
            icon={CreditCard}
            label="Perfil de crédito"
            value="Pré-aprovado"
            tone="neutral"
          />
        </div>
      </Card>

      {/* Liberações resumo */}
      <Card>
        <CardTitle
          icon={ArrowDownLeft}
          action={<Badge tone="gain">6 liberações</Badge>}
        >
          Liberações
        </CardTitle>
        <p className="font-sans text-xs text-soma-muted">Total liberado</p>
        <Money value={168000} size="lg" className="mt-0.5" />
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/4 p-3">
          <div>
            <p className="font-sans text-xs text-soma-muted">Próxima parcela</p>
            <p className="font-num text-sm font-semibold tabular-nums text-soma-text">
              R$ 42.000
            </p>
          </div>
          <button className="flex items-center gap-1 font-sans text-xs font-semibold text-soma-gold">
            Ver extrato <ChevronRight size={14} />
          </button>
        </div>
      </Card>
    </>
  );
}

/* ── Operação ────────────────────────────────────────────────────────── */

function Operacao() {
  return (
    <>
      <div className="pt-2">
        <Eyebrow>Minha operação</Eyebrow>
        <p className="mt-1 font-sans text-sm text-soma-muted">
          Obra e crédito em um só lugar.
        </p>
      </div>

      <Card>
        <CardTitle icon={HardHat} action={<Badge tone="gain">Ativa</Badge>}>
          Residencial Vista Verde
        </CardTitle>
        <div className="mb-3 flex items-center justify-between font-sans text-xs">
          <span className="text-soma-muted">Progresso da obra</span>
          <span className="font-semibold text-soma-text">40%</span>
        </div>
        <ProgressBar pct={40} />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/4 p-3">
            <p className="font-sans text-xs text-soma-muted">Etapa atual</p>
            <p className="font-sans text-sm font-semibold text-soma-text">
              Alvenaria · 3/6
            </p>
          </div>
          <div className="rounded-2xl bg-white/4 p-3">
            <p className="font-sans text-xs text-soma-muted">Prazo</p>
            <p className="font-sans text-sm font-semibold text-soma-text">
              Mar 2027
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle icon={CreditCard}>Crédito</CardTitle>
        <div className="flex items-end justify-between">
          <div>
            <p className="font-sans text-xs text-soma-muted">Aprovado</p>
            <Money value={420000} size="lg" />
          </div>
          <div className="text-right">
            <p className="font-sans text-xs text-soma-muted">Taxa</p>
            <p className="font-num text-sm font-semibold tabular-nums text-soma-text">
              1,19% a.m.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <GoldButton full icon={TrendingUp}>
            Simular antecipação
          </GoldButton>
        </div>
      </Card>
    </>
  );
}

/* ── Movimentações ───────────────────────────────────────────────────── */

const MOVS = [
  { nome: "Liberação · Etapa 3", data: "14 Jun 2026", valor: 42000, tone: "gain" as const, status: "Confirmada" },
  { nome: "Liberação · Etapa 2", data: "02 Mai 2026", valor: 42000, tone: "gain" as const, status: "Confirmada" },
  { nome: "Parcela · Abril", data: "05 Abr 2026", valor: -4990, tone: "loss" as const, status: "Paga" },
  { nome: "Liberação · Etapa 1", data: "18 Mar 2026", valor: 84000, tone: "gain" as const, status: "Confirmada" },
];

function Movimentacoes() {
  return (
    <>
      <div className="pt-2">
        <Eyebrow>Movimentações</Eyebrow>
        <p className="mt-1 font-sans text-sm text-soma-muted">
          Liberações e parcelas da sua operação.
        </p>
      </div>
      <Card className="p-2">
        <div className="divide-y divide-soma-line/60">
          {MOVS.map((m, i) => (
            <div key={i} className="flex items-center gap-3 px-2.5 py-3.5">
              <span
                className={
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full " +
                  (m.tone === "gain"
                    ? "bg-soma-gain/12 text-soma-gain"
                    : "bg-soma-loss/12 text-soma-loss")
                }
              >
                {m.tone === "gain" ? (
                  <ArrowDownLeft size={16} />
                ) : (
                  <ArrowUpRight size={16} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-sm font-semibold text-soma-text">
                  {m.nome}
                </p>
                <p className="font-sans text-xs text-soma-muted">{m.data}</p>
              </div>
              <div className="text-right">
                <Money value={m.valor} sign size="sm" />
                <div className="mt-0.5">
                  <Badge tone={m.tone}>{m.status}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="pt-2">
      <Eyebrow>{title}</Eyebrow>
      <Card className="mt-3">
        <p className="font-sans text-sm text-soma-muted">
          Tela em construção no novo formato.
        </p>
      </Card>
    </div>
  );
}

export default function SomaPreviewPage() {
  const [active, setActive] = useState("inicio");

  return (
    <div className="min-h-[100dvh] bg-black">
      <SomaShell
        user={{ name: "Ricardo Alves", role: "Cliente" }}
        nav={NAV}
        menu={MENU}
        activeId={active}
        onSelect={setActive}
      >
        {active === "inicio" && <Inicio />}
        {active === "operacao" && <Operacao />}
        {active === "documentos" && <Movimentacoes />}
        {active === "viabilidade" && <Placeholder title="Viabilidade" />}
        {active === "menu" && <Placeholder title="Menu" />}
      </SomaShell>
    </div>
  );
}

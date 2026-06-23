import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, Building2, ArrowRight, Bell } from "lucide-react";
import {
  creditoApi,
  obrasApi,
  kycApi,
  notificacoesApi,
  type CreditoResumo,
  type ObraResumo,
  type KycStatus,
  type Notificacao,
} from "@/lib/api";
import { formatarBRL } from "@imbobi/core";
import { TomadorJourney } from "@/components/dashboard/TomadorJourney";
import { TOMADOR_ROUTES } from "@/lib/tomador-flow";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Início — IMOBI" };

const NAVY = "#0C1A3D";
const MINT = "#4ADE80";

export default async function InicioPage() {
  const [creditos, obras, kycStatus, notifs] = await Promise.all([
    creditoApi.meus().catch(() => [] as CreditoResumo[]),
    obrasApi.listar().catch(() => [] as ObraResumo[]),
    kycApi.obterStatus().catch(() => null as KycStatus | null),
    notificacoesApi.listarNaoLidas().catch(() => [] as Notificacao[]),
  ]);

  const creditoAtivo = creditos.find((c) => c.status === "ATIVO") ?? null;
  const jornadaCompleta =
    (kycStatus?.resumo.aprovados ?? 0) >= 4 &&
    obras.length > 0 &&
    creditos.some((c) => c.status === "ATIVO");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Olá!</h1>
        <p className="mt-1 text-sm text-gray-500">
          {jornadaCompleta
            ? "Acompanhe sua operação e obras."
            : "Siga os passos abaixo para solicitar seu crédito."}
        </p>
      </div>

      {notifs.length > 0 && (
        <Link
          href="/dashboard/notificacoes"
          className="flex items-center gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800"
        >
          <Bell className="h-4 w-4 shrink-0" />
          {notifs.length} notificação{notifs.length !== 1 ? "ões" : ""} não lida
          {notifs.length !== 1 ? "s" : ""}
          <ArrowRight className="ml-auto h-4 w-4" />
        </Link>
      )}

      <TomadorJourney kycStatus={kycStatus} obras={obras} creditos={creditos} />

      {creditoAtivo && (
        <div
          className="rounded-2xl p-5 text-white"
          style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a2f5e 100%)` }}
        >
          <p className="text-[0.65rem] uppercase tracking-wider text-white/40">Crédito ativo</p>
          <p className="mt-1 text-lg font-bold">
            {creditoAtivo.obras?.[0]?.nome ?? "Operação IMOBI"}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-[0.6rem] text-white/50">Aprovado</p>
              <p className="text-sm font-bold" style={{ color: MINT }}>
                {formatarBRL(Number(creditoAtivo.valorAprovado))}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-[0.6rem] text-white/50">Liberado</p>
              <p className="text-sm font-bold">{formatarBRL(Number(creditoAtivo.valorLiberado))}</p>
            </div>
          </div>
          <Link
            href={TOMADOR_ROUTES.creditoExtrato}
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-white/90 hover:text-white"
          >
            Ver extrato completo
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {obras.length > 0 && (
        <Link
          href={TOMADOR_ROUTES.obras}
          className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-[#1B4FD8]/30"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <Building2 className="h-5 w-5 text-[#1B4FD8]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">Minhas obras</p>
            <p className="text-xs text-gray-500">
              {obras.length} cadastrada{obras.length !== 1 ? "s" : ""}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400" />
        </Link>
      )}

      {!creditoAtivo && jornadaCompleta && (
        <Link
          href={TOMADOR_ROUTES.credito}
          className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <CreditCard className="h-5 w-5 text-[#1B4FD8]" />
          <span className="text-sm font-semibold text-gray-900">Simular ou solicitar crédito</span>
          <ArrowRight className="ml-auto h-4 w-4 text-gray-400" />
        </Link>
      )}
    </div>
  );
}

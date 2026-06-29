"use client";

import Link from "next/link";
import type { Route } from "next";
import {
  Inbox,
  FileCheck2,
  FileText,
  HardHat,
  MapPin,
  Vote,
  Banknote,
  User,
  ArrowRight,
} from "lucide-react";
import { AdminFilasBar } from "@/components/admin/AdminFilasBar";
import { AdminSipocPanel } from "./AdminSipocPanel";

const NAVY = "#0C1A3D";
const ROYAL = "#1B4FD8";

const FILAS: { label: string; href: Route; desc: string; icon: typeof Inbox }[] = [
  { label: "Propostas", href: "/dashboard/admin/propostas", desc: "Leads /envie-seu-projeto", icon: Inbox },
  { label: "KYC", href: "/dashboard/admin/kyc", desc: "Documentos do tomador", icon: FileCheck2 },
  { label: "Viabilidade", href: "/dashboard/admin/viabilidade", desc: "Dossiê e análise", icon: FileText },
  { label: "Obras", href: "/dashboard/admin/obras", desc: "Homologação → pipe ativo", icon: HardHat },
  { label: "Vistorias", href: "/dashboard/admin/vistorias", desc: "Fila técnica (engenheiro)", icon: MapPin },
  { label: "Comitê", href: "/dashboard/admin/comite", desc: "Crédito e votação", icon: Vote },
  { label: "Pipeline", href: "/dashboard/admin/pipeline", desc: "Visão comercial unificada", icon: Banknote },
  { label: "Usuários", href: "/dashboard/admin/usuarios", desc: "Contas e perfis", icon: User },
];

export function AdminCommandCenter() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-[#4ADE80]">Admin IMOBI</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0C1A3D] sm:text-4xl">
          Centro de comando
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">
          Fluxo único: proposta → KYC → viabilidade → obra → comitê → vistoria → pagamento SIPOC →
          quitação.
        </p>
      </header>

      <AdminFilasBar />

      <AdminSipocPanel />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Filas operacionais</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {FILAS.map(({ label, href, desc, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-[#1B4FD8]/30 hover:shadow-md"
            >
              <div className="rounded-xl bg-blue-50 p-2.5 text-[#1B4FD8]">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 group-hover:text-[#1B4FD8]" />
            </Link>
          ))}
        </div>
      </section>

      <div className="rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-xs text-blue-900">
        <strong>SIPOC:</strong> homologação (Admin) → evidências (Tomador) → vistoria (Engenheiro) →
        pagamento manual (Admin). Gestor do fundo acompanha DRE e KPIs agregados em modo leitura.
      </div>
    </div>
  );
}

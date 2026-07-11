"use client";

import Link from "next/link";
import type { Route } from "next";
import {
  FileCheck2,
  HardHat,
  Banknote,
  User,
  ArrowRight,
  Layers3,
} from "lucide-react";
import { AdminFilasBar } from "@/components/admin/AdminFilasBar";
import { AdminOperacionalPanel } from "./AdminOperacionalPanel";

const NAVY = "#0C1A3D";

const FILAS: { label: string; href: string; desc: string; icon: typeof FileCheck2 }[] = [
  { label: "Documentos", href: "/dashboard/admin/documentos", desc: "KYC e revisão de arquivos", icon: FileCheck2 },
  { label: "Obras", href: "/dashboard/admin/obras", desc: "Homologação e funil EtapaFunil", icon: HardHat },
  { label: "Tranches", href: "/dashboard/admin/tranches", desc: "Liberação após validação do engenheiro", icon: Banknote },
  { label: "Usuários", href: "/dashboard/admin/usuarios", desc: "Admin, Cliente, Fundo, Engenheiro", icon: User },
];

export function AdminCommandCenter() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-[#4ADE80]">Admin IMOBI · modelo canônico</p>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ color: NAVY }}>
          Centro de comando
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">
          Funil único <strong>EtapaFunil</strong>: documentos → análise → obra → homologação → tranches → quitado.
          Quatro papéis: Cliente, Engenheiro, Fundo e Admin.
        </p>
      </header>

      <AdminFilasBar />

      <AdminOperacionalPanel />

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Layers3 className="h-4 w-4 text-[#1B4FD8]" />
          <h2 className="text-sm font-semibold text-gray-900">Filas operacionais</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {FILAS.map(({ label, href, desc, icon: Icon }) => (
            <Link
              key={href}
              href={href as Route}
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

      <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-xs text-emerald-900">
        <strong>Fluxo atual:</strong> Cliente envia documentos → Admin avança dossiê → Cliente cadastra obra →
        Admin homologa com engenheiro → Engenheiro valida tranches → Admin libera valor. Fundo acompanha em{" "}
        <Link href={"/dashboard/fundo" as Route} className="font-semibold underline">
          /dashboard/fundo
        </Link>
        .
      </div>
    </div>
  );
}

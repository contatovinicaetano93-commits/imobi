"use client";

import Link from "next/link";
import type { Route } from "next";
import { useAdminFilasPoll } from "@/hooks/use-admin-filas-poll";

const ITENS = [
  { key: "documentosPendentes" as const, label: "Documentos", href: "/dashboard/admin/documentos" },
  { key: "obrasParaHomologar" as const, label: "Homologação", href: "/dashboard/admin/obras" },
  { key: "tranchesParaLiberar" as const, label: "Tranches", href: "/dashboard/admin/tranches" },
];

export function AdminFilasBar() {
  const { filas } = useAdminFilasPoll();

  if (!filas) return null;

  const total =
    filas.documentosPendentes + filas.obrasParaHomologar + filas.tranchesParaLiberar;

  if (total === 0) {
    return (
      <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-2 text-xs text-green-800">
        Filas operacionais zeradas — funil canônico em dia (atualização a cada 45s)
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3">
      <span className="text-xs font-semibold text-amber-900">Pendências · auto 45s</span>
      {ITENS.map(({ key, label, href }) => {
        const n = filas[key];
        if (n === 0) return null;
        return (
          <Link
            key={key}
            href={href as Route}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0C1A3D] shadow-sm ring-1 ring-amber-200/80 hover:bg-amber-50"
          >
            {label}
            <span className="rounded-full bg-[#1B4FD8] px-1.5 py-0.5 text-[10px] font-bold text-white">{n}</span>
          </Link>
        );
      })}
    </div>
  );
}

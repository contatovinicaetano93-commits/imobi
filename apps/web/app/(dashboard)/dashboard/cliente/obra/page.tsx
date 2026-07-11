"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Route } from "next";
import { HardHat, PlusCircle, ArrowRight } from "lucide-react";
import { formatarBRL } from "@imbobi/core";
import { obrasCanonicoApi, type ObraCanonica } from "@/lib/api";
import { PageSkeleton } from "@/app/(dashboard)/_components/PageSkeleton";

const ETAPA_LABELS: Record<string, string> = {
  KYC_PENDENTE: "KYC pendente",
  DOSSIE_EM_ANALISE: "Dossiê em análise",
  APROVADO: "Aprovado",
  OBRA_CADASTRADA: "Obra cadastrada",
  HOMOLOGADA: "Homologada",
  EM_ANDAMENTO: "Em andamento",
  QUITADO: "Quitada",
};

export default function ClienteObraPage() {
  const [obras, setObras] = useState<ObraCanonica[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    obrasCanonicoApi.minhas()
      .then(setObras)
      .catch(() => setObras([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0C1A3D]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Minha obra
          </h1>
          <p className="mt-1 text-sm text-gray-500">Acompanhe o cadastro, homologação e tranches.</p>
        </div>
        <Link
          href={"/dashboard/cliente/obra/nova" as Route}
          className="inline-flex items-center gap-2 rounded-xl bg-[#4ADE80] px-3 py-2 text-xs font-bold text-[#0C1A3D] no-underline"
        >
          <PlusCircle size={14} />
          Nova obra
        </Link>
      </div>

      {obras.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
          <HardHat className="mx-auto mb-3 text-gray-300" size={32} />
          <p className="text-sm text-gray-500">Nenhuma obra cadastrada ainda.</p>
          <Link href={"/dashboard/cliente/obra/nova" as Route} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#1B4FD8] no-underline">
            Cadastrar obra <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {obras.map((obra) => (
            <div key={obra.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-gray-900">{obra.nome}</p>
                  <p className="mt-1 text-sm text-gray-500">{obra.endereco}</p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#1B4FD8]">
                  {ETAPA_LABELS[obra.etapa] ?? obra.etapa}
                </span>
              </div>
              <p className="mt-3 text-sm text-gray-600">
                Crédito: <strong>{formatarBRL(Number(obra.valorCredito))}</strong>
              </p>
              {obra.tranches && obra.tranches.length > 0 && (
                <p className="mt-2 text-xs text-gray-400">{obra.tranches.length} tranche(s)</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

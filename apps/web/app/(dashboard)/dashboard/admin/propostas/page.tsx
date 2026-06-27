"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { propostasApi, type PropostaAdminResumo } from "@/lib/api";
import { useAdminFilasOnChange } from "@/hooks/use-admin-filas-poll";
import { Clock, Inbox, Mail, Phone, User } from "lucide-react";
import { PageSkeleton } from "@/app/(dashboard)/_components/PageSkeleton";
import { useToast } from "@/hooks/toast-context";
import { PanelSection } from "@/components/dashboard/PanelSection";
import { DashboardPanelShell } from "@/components/dashboard/DashboardPanelShell";

const TIPO_LABEL: Record<string, string> = {
  OBRA_NOVA: "Obra nova",
  OBRA_EM_ANDAMENTO: "Obra em andamento",
  CREDITO_PONTE: "Crédito ponte",
};

const STATUS_LABEL: Record<string, string> = {
  RECEBIDA: "Recebida",
  EM_ANALISE: "Em análise",
  APROVADA: "Aprovada",
  REJEITADA: "Rejeitada",
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminPropostasPage() {
  const { error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [lista, setLista] = useState<PropostaAdminResumo[]>([]);

  const carregar = useCallback(async () => {
    try {
      const items = await propostasApi.listarAdmin();
      setLista(items);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro ao listar propostas");
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useAdminFilasOnChange(carregar);

  const pendentes = lista.filter((p) => p.status === "RECEBIDA" || p.status === "EM_ANALISE");

  const panels = useMemo(
    () => [
      ...(pendentes.length > 0
        ? [{ id: "prop-alertas", priority: "critical" as const }]
        : []),
      { id: "prop-lista", priority: "primary" as const },
    ],
    [pendentes.length],
  );

  if (loading) {
    return (
      <div className="max-w-4xl p-4 sm:p-6">
        <PageSkeleton variant="list" count={5} />
      </div>
    );
  }

  return (
    <DashboardPanelShell
      panels={panels}
      maxWidth="md"
      content={
        <>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Propostas públicas</h1>
            <p className="mt-1 text-sm text-gray-500">
              Leads enviados via /envie-seu-projeto antes do cadastro na plataforma.
            </p>
          </div>

          {pendentes.length > 0 && (
            <PanelSection
              id="prop-alertas"
              title="Aguardando triagem"
              icon={<Clock className="w-4 h-4 text-amber-600" />}
              priority="critical"
              badge={pendentes.length}
              summary={`${pendentes.length} proposta(s) na fila`}
              urgency="warning"
            >
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Propostas com o mesmo e-mail são vinculadas automaticamente quando o tomador se cadastra.
              </div>
            </PanelSection>
          )}

          <PanelSection
            id="prop-lista"
            title="Todas as propostas"
            icon={<Inbox className="w-4 h-4 text-[#1B4FD8]" />}
            priority="primary"
            badge={lista.length}
            summary={`${lista.length} registro(s)`}
          >
            {lista.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma proposta recebida ainda.</p>
            ) : (
              <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
                {lista.map((p) => (
                  <li key={p.id} className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900">{p.nomeEmpreendimento}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {TIPO_LABEL[p.tipoCredito] ?? p.tipoCredito} · {formatarData(p.criadoEm)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                          p.status === "RECEBIDA"
                            ? "bg-amber-100 text-amber-800"
                            : p.status === "EM_ANALISE"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        {p.nomeContato}
                      </span>
                      <span className="inline-flex items-center gap-1.5 truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        {p.email}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        {p.telefone}
                      </span>
                      {p.empresa && (
                        <span className="truncate text-gray-500">{p.empresa}</span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                      {p.usuarioId ? (
                        <span className="rounded-md bg-green-50 px-2 py-1 font-medium text-green-700">
                          Vinculada ao cadastro
                        </span>
                      ) : (
                        <span className="rounded-md bg-gray-50 px-2 py-1 font-medium text-gray-500">
                          Aguardando cadastro com mesmo e-mail
                        </span>
                      )}
                      <Link
                        href="/dashboard/admin/viabilidade"
                        className="font-semibold text-[#1B4FD8] hover:underline"
                      >
                        Ver fila de viabilidade
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </PanelSection>
        </>
      }
    />
  );
}

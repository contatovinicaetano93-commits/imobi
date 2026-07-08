"use client";

import { useEffect, useState } from "react";
import { obrasApi, safeArr, type ObraResumo } from "@/lib/api";
import { ObrasListClient } from "./ObrasListClient";
import { PageSkeleton } from "@/app/(dashboard)/_components/PageSkeleton";

export function ObrasPageClient() {
  const [obras, setObras] = useState<ObraResumo[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => (d?.authenticated ? (d.role as string) : null)),
      obrasApi.listar().catch(() => [] as ObraResumo[]),
    ])
      .then(([userRole, list]) => {
        setRole(userRole);
        setObras(safeArr<ObraResumo>(list));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar obras");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PageSkeleton variant="list" />;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  return <ObrasListClient obras={obras} role={role} />;
}

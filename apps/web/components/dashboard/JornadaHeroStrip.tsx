"use client";

import { NextStepHero } from "@/components/dashboard/NextStepHero";
import { JornadaError } from "@/components/dashboard/JornadaError";
import { useJornada } from "@/hooks/jornada-context";

type Props = {
  variant: "tomador" | "gestor";
};

/** Faixa de próximo passo no topo do painel — não bloqueia o restante do dashboard. */
export function JornadaHeroStrip({ variant }: Props) {
  const { jornada, loading, refreshing, error, refresh } = useJornada();

  if (loading && !jornada) {
    return (
      <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-gray-500">Carregando seu próximo passo…</p>
      </div>
    );
  }

  if (!jornada) {
    return (
      <div className="mb-4">
        <JornadaError message={error ?? undefined} onRetry={() => void refresh()} />
      </div>
    );
  }

  return (
    <div className="relative mb-6">
      {refreshing && (
        <div
          className="pointer-events-none absolute inset-0 z-10 rounded-3xl bg-white/40"
          aria-hidden
        />
      )}
      <NextStepHero jornada={jornada} variant={variant} />
    </div>
  );
}

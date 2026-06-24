"use client";

import { NextStepHero } from "@/components/dashboard/NextStepHero";
import { JornadaError } from "@/components/dashboard/JornadaError";
import { GuidedFlowShell } from "@/components/dashboard/GuidedFlowShell";
import { useJornada } from "@/hooks/jornada-context";

export function GestorMvpHub() {
  const { jornada, loading, error, refresh } = useJornada();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <p className="text-sm text-gray-500">Carregando seu próximo passo…</p>
      </div>
    );
  }

  if (!jornada) {
    return (
      <div className="flex min-h-[70vh] items-start justify-center p-4 pt-8 sm:p-6">
        <JornadaError message={error ?? undefined} onRetry={() => void refresh()} />
      </div>
    );
  }

  return (
    <GuidedFlowShell variant="gestor" hideStepRail>
      <NextStepHero jornada={jornada} variant="gestor" />
    </GuidedFlowShell>
  );
}

"use client";

import { NextStepHero } from "@/components/dashboard/NextStepHero";
import { JornadaError } from "@/components/dashboard/JornadaError";
import { PanelSection } from "@/components/dashboard/PanelSection";
import { JORNADA_PANEL_ID } from "@/components/dashboard/PanelToolbar";
import { useJornada } from "@/hooks/jornada-context";

type Props = {
  variant: "tomador" | "gestor";
};

/** Próximo passo — colapsável como os demais quadros do painel. */
export function JornadaHeroStrip({ variant }: Props) {
  const { jornada, loading, refreshing, error, refresh } = useJornada();

  const summary = loading
    ? "Carregando…"
    : jornada?.titulo ?? (error ? "Erro ao carregar" : "—");

  return (
    <PanelSection
      id={JORNADA_PANEL_ID}
      title="Seu próximo passo"
      priority="primary"
      summary={summary}
      badge={
        jornada && !jornada.concluido && jornada.totalPassos > 0
          ? `${jornada.progressoPct}%`
          : undefined
      }
      urgency={error ? "critical" : "none"}
    >
      {loading && !jornada ? (
        <p className="py-6 text-center text-sm text-gray-500">Carregando seu próximo passo…</p>
      ) : !jornada ? (
        <JornadaError message={error ?? undefined} onRetry={() => void refresh()} />
      ) : (
        <div className={refreshing ? "pointer-events-none opacity-60 transition-opacity" : ""}>
          <NextStepHero jornada={jornada} variant={variant} />
        </div>
      )}
    </PanelSection>
  );
}

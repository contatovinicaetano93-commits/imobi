import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import type { Jornada } from "@/lib/api";
import { getPassoNumero, getStepsForJornada } from "@/lib/jornada-steps";

const NAVY = "#0C1A3D";
const MINT = "#4ADE80";
const ROYAL = "#1B4FD8";

type Props = {
  jornada: Jornada;
  variant?: "cliente" | "fundo";
};

export function NextStepHero({ jornada, variant = "cliente" }: Props) {
  const accent = variant === "fundo" ? "#7c3aed" : ROYAL;
  const isFundo = variant === "fundo" || jornada.role === "FUNDO";
  const waiting =
    !isFundo &&
    jornada.etapaAtual === "DOSSIE_EM_ANALISE";
  const passoNumero = getPassoNumero(jornada);
  const totalPassos = getStepsForJornada(jornada).length || 1;
  const heroLabel = isFundo ? "Painel do fundo" : jornada.concluido ? "Tudo certo" : "Seu próximo passo";

  return (
    <section
      className="mx-auto flex w-full max-w-lg flex-col gap-5"
      aria-label={isFundo ? "Painel do fundo" : "Próximo passo"}
    >
      <div
        className="overflow-hidden rounded-3xl text-white shadow-lg"
        style={{
          background: isFundo
            ? "linear-gradient(145deg, #3b0764 0%, #5b21b6 100%)"
            : `linear-gradient(145deg, ${NAVY} 0%, #1e3a6e 100%)`,
        }}
      >
        <div className="p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-white/50">
            {heroLabel}
          </p>
          <h1
            className="mt-2 text-2xl font-bold leading-tight sm:text-3xl"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {jornada.titulo}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/75">
            {jornada.descricao}
          </p>

          {!isFundo && (
            <div className="mt-6">
              <div className="mb-2 flex justify-between text-xs text-white/50">
                <span>
                  {jornada.concluido
                    ? `${totalPassos} de ${totalPassos} etapas`
                    : waiting
                      ? `Passo ${passoNumero} em andamento`
                      : `Passo ${passoNumero} de ${totalPassos}`}
                </span>
                <span>{jornada.progressoPct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${jornada.progressoPct}%`, background: MINT }}
                />
              </div>
            </div>
          )}

          {!jornada.concluido && !waiting && !isFundo && (
            <Link
              href={jornada.href as "/"}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold no-underline transition hover:opacity-95"
              style={{ background: MINT, color: NAVY }}
            >
              Continuar
              <ArrowRight size={18} />
            </Link>
          )}

          {waiting && (
            <div className="mt-6 flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm text-white/80">
              <Clock size={18} className="shrink-0" />
              Em análise — você será notificado quando avançar.
            </div>
          )}

          {jornada.concluido && !isFundo && (
            <Link
              href={jornada.href as "/"}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 py-3.5 text-sm font-semibold text-white no-underline hover:bg-white/10"
            >
              <CheckCircle2 size={18} style={{ color: MINT }} />
              Ver progresso
            </Link>
          )}
        </div>
      </div>

      {isFundo ? (
        <p className="text-center text-xs text-gray-400">
          Apenas dados e KPIs — somente leitura
        </p>
      ) : !jornada.concluido ? (
        <p className="text-center text-xs text-gray-400">
          Passo {passoNumero} de {totalPassos}
          <span style={{ color: accent }}> · </span>
          Siga na ordem para liberar seu crédito
        </p>
      ) : null}
    </section>
  );
}

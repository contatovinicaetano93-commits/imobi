import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import type { Jornada } from "@/lib/api";
import { getPassoNumero } from "@/lib/jornada-steps";

const NAVY = "#0C1A3D";
const MINT = "#4ADE80";
const ROYAL = "#1B4FD8";

type Props = {
  jornada: Jornada;
  variant?: "tomador" | "gestor";
};

/** Um único passo — estilo app de banco. */
export function NextStepHero({ jornada, variant = "tomador" }: Props) {
  const accent = variant === "gestor" ? "#7c3aed" : ROYAL;
  const waiting =
    jornada.passoAtual === "aguardando" ||
    (jornada.bloqueado != null && jornada.passoAtual !== "kyc" && jornada.passoAtual !== "gestor_kyc");
  const passoNumero = getPassoNumero(jornada);

  return (
    <section
      className="mx-auto flex w-full max-w-lg flex-col gap-5"
      aria-label="Próximo passo"
    >
      <div
        className="overflow-hidden rounded-3xl text-white shadow-lg"
        style={{
          background: variant === "gestor"
            ? "linear-gradient(145deg, #3b0764 0%, #5b21b6 100%)"
            : `linear-gradient(145deg, ${NAVY} 0%, #1e3a6e 100%)`,
        }}
      >
        <div className="p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-white/50">
            {jornada.concluido ? "Tudo certo" : "Seu próximo passo"}
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

          {jornada.totalPassos > 0 && (
            <div className="mt-6">
              <div className="mb-2 flex justify-between text-xs text-white/50">
                <span>
                  {jornada.concluido
                    ? `${jornada.totalPassos} de ${jornada.totalPassos} etapas`
                    : waiting
                      ? `Passo ${passoNumero} em andamento`
                      : `${jornada.passosConcluidos} de ${jornada.totalPassos} concluídas`}
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

          {!jornada.concluido && !waiting && (
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

          {jornada.concluido && (
            <Link
              href={jornada.href as "/"}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 py-3.5 text-sm font-semibold text-white no-underline hover:bg-white/10"
            >
              <CheckCircle2 size={18} style={{ color: MINT }} />
              Ver extrato e progresso
            </Link>
          )}
        </div>
      </div>

      {jornada.fila && (jornada.fila.kyc > 0 || jornada.fila.etapas > 0) && (
        <p className="text-center text-xs text-gray-500">
          Fila operacional: {jornada.fila.kyc} KYC · {jornada.fila.etapas} etapas
        </p>
      )}

      {!jornada.concluido && (
        <p className="text-center text-xs text-gray-400">
          Passo {passoNumero} de {jornada.totalPassos || 1}
          <span style={{ color: accent }}> · </span>
          {variant === "gestor"
            ? "Acompanhe a fila na ordem — sem ações de aprovação"
            : "Siga na ordem para liberar seu crédito"}
        </p>
      )}
    </section>
  );
}

"use client";

import Link from "next/link";
import type { Jornada } from "@/lib/api";
import { getStepsForJornada, getPassoIndex, getPassoNumero } from "@/lib/jornada-steps";
import { useJornada } from "@/hooks/jornada-context";
import { JornadaError } from "./JornadaError";

const NAVY = "#0C1A3D";
const MINT = "#4ADE80";
const ROYAL = "#1B4FD8";

type Props = {
  variant: "cliente" | "fundo";
  children: React.ReactNode;
  hideStepRail?: boolean;
  pageTitle?: string;
  pageSubtitle?: string;
};

function Logo({ size = 22 }: { size?: number }) {
  return (
    <div
      className="grid shrink-0 gap-0.5 rounded-md border p-1"
      style={{
        width: size,
        height: size,
        borderColor: MINT,
        gridTemplateColumns: "1fr 1fr 1fr",
        gridTemplateRows: "1fr 1fr 1fr",
      }}
    >
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <span
          key={i}
          className="block rounded-sm"
          style={{ background: [1, 3, 5, 7].includes(i) ? "transparent" : MINT }}
        />
      ))}
    </div>
  );
}

function StepRail({ jornada }: { jornada: Jornada }) {
  const steps = getStepsForJornada(jornada);
  const currentIdx = getPassoIndex(jornada);
  const accent = jornada.role === "FUNDO" ? "#7c3aed" : ROYAL;

  return (
    <nav aria-label="Etapas da jornada" className="mt-4 overflow-x-auto pb-1">
      <ol className="flex min-w-max items-center gap-0">
        {steps.map((step, idx) => {
          const done = idx < currentIdx || (jornada.concluido && idx <= currentIdx);
          const active = idx === currentIdx && !jornada.concluido;
          return (
            <li key={step.id} className="flex items-center">
              <div className="flex flex-col items-center gap-1 px-1 sm:px-2">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition-colors sm:h-8 sm:w-8 sm:text-xs"
                  style={{
                    background: done ? MINT : active ? accent : "rgba(12,26,61,0.08)",
                    color: done ? NAVY : active ? "#fff" : "rgba(12,26,61,0.35)",
                    boxShadow: active ? `0 0 0 3px ${accent}33` : undefined,
                  }}
                >
                  {done ? "✓" : idx + 1}
                </span>
                <span
                  className="max-w-[3.5rem] truncate text-center text-[10px] font-semibold sm:max-w-none sm:text-xs"
                  style={{ color: active ? NAVY : "rgba(12,26,61,0.45)" }}
                >
                  {step.shortLabel}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className="mx-0.5 h-0.5 w-4 rounded sm:w-8"
                  style={{ background: done ? MINT : "rgba(12,26,61,0.1)" }}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function GuidedFlowShell({
  variant,
  children,
  hideStepRail = false,
  pageTitle,
  pageSubtitle,
}: Props) {
  const { jornada, loading, error, refresh } = useJornada();

  if (loading) {
    return (
      <div className="guided-shell flex min-h-[calc(100vh-52px)] items-center justify-center">
        <p className="text-sm text-gray-500">Carregando sua jornada…</p>
      </div>
    );
  }

  if (error || !jornada) {
    return (
      <div className="guided-shell flex min-h-[calc(100vh-52px)] items-start justify-center p-6 pt-10">
        <JornadaError
          message={error ?? undefined}
          onRetry={() => void refresh()}
        />
      </div>
    );
  }

  const accent = variant === "fundo" ? "#7c3aed" : ROYAL;
  const totalPassos = getStepsForJornada(jornada).length;

  return (
    <div className="guided-shell min-h-[calc(100vh-52px)]">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(27,79,216,0.08), transparent),
            linear-gradient(180deg, #EEF3FF 0%, #f8faff 100%)
          `,
        }}
      />
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="rounded-2xl border border-white/80 bg-white/70 px-5 py-4 shadow-sm backdrop-blur-sm sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 no-underline">
              <Logo />
              <span
                className="text-lg font-extrabold tracking-wide text-[#0C1A3D]"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                IMOBI
              </span>
            </Link>
            {totalPassos > 0 && (
              <span
                className="shrink-0 rounded-full px-3 py-1 text-xs font-bold"
                style={{ background: `${accent}14`, color: accent }}
              >
                Passo {getPassoNumero(jornada)} de {totalPassos}
              </span>
            )}
          </div>
          {!hideStepRail && <StepRail jornada={jornada} />}
        </header>

        {(pageTitle || pageSubtitle) && (
          <div className="mb-2 mt-6">
            {pageTitle && (
              <h1
                className="text-2xl font-bold tracking-tight text-[#0C1A3D] sm:text-3xl"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                {pageTitle}
              </h1>
            )}
            {pageSubtitle && (
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{pageSubtitle}</p>
            )}
          </div>
        )}

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

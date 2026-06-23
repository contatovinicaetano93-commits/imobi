import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Circle,
  CreditCard,
  FileText,
} from "lucide-react";
import type { CreditoResumo, KycStatus, ObraResumo } from "@/lib/api";
import { KYC_DOC_CATALOG } from "@imbobi/schemas";
import { TOMADOR_ROUTES } from "@/lib/tomador-flow";

export type TomadorJourneyProps = {
  kycStatus: KycStatus | null;
  obras: ObraResumo[];
  creditos: CreditoResumo[];
};

type StepState = "done" | "current" | "upcoming";

function stepState(done: boolean, isCurrent: boolean): StepState {
  if (done) return "done";
  if (isCurrent) return "current";
  return "upcoming";
}

export function TomadorJourney({ kycStatus, obras, creditos }: TomadorJourneyProps) {
  const kycTotal = KYC_DOC_CATALOG.length;
  const kycAprovados = kycStatus?.resumo.aprovados ?? 0;
  const kycDone = kycAprovados >= kycTotal;
  const obrasDone = obras.length > 0;
  const creditoSolicitado = creditos.length > 0;
  const creditoAtivo = creditos.some((c) => c.status === "ATIVO");

  const steps = [
    {
      id: "kyc",
      title: "Verificar identidade",
      desc: kycDone
        ? "Documentos aprovados"
        : `${kycAprovados}/${kycTotal} documentos enviados`,
      href: TOMADOR_ROUTES.documentos,
      cta: kycDone ? "Ver documentos" : "Enviar documentos",
      icon: FileText,
      done: kycDone,
      current: !kycDone,
    },
    {
      id: "obras",
      title: "Cadastrar obra",
      desc: obrasDone
        ? `${obras.length} obra${obras.length !== 1 ? "s" : ""} cadastrada${obras.length !== 1 ? "s" : ""}`
        : "Registre o imóvel da construção",
      href: obrasDone ? TOMADOR_ROUTES.obras : `${TOMADOR_ROUTES.obraNova}?retorno=inicio`,
      cta: obrasDone ? "Ver obras" : "Nova obra",
      icon: Building2,
      done: obrasDone,
      current: kycDone && !obrasDone,
    },
    {
      id: "credito",
      title: "Simular e solicitar crédito",
      desc: creditoAtivo
        ? "Crédito ativo"
        : creditoSolicitado
          ? "Solicitação em análise"
          : "Estime viabilidade e envie para análise",
      href: creditoAtivo
        ? TOMADOR_ROUTES.creditoExtrato
        : creditoSolicitado
          ? TOMADOR_ROUTES.creditoExtrato
          : TOMADOR_ROUTES.credito,
      cta: creditoAtivo ? "Ver crédito" : creditoSolicitado ? "Acompanhar" : "Continuar",
      icon: CreditCard,
      done: creditoAtivo,
      current: kycDone && obrasDone && !creditoAtivo && !creditoSolicitado,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  if (completed === steps.length) return null;

  return (
    <section className="rounded-2xl border border-[#1B4FD8]/20 bg-gradient-to-br from-[#EEF3FF] to-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1B4FD8]">
            Seu caminho no IMOBI
          </p>
          <h2 className="mt-0.5 text-lg font-bold text-gray-900">
            {completed === 0
              ? "Comece pela verificação de identidade"
              : completed === 1
                ? "Ótimo — cadastre sua obra"
                : "Quase lá — simule e solicite crédito"}
          </h2>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#1B4FD8] ring-1 ring-[#1B4FD8]/20">
          {completed}/{steps.length}
        </span>
      </div>

      <ol className="space-y-3">
        {steps.map((step, index) => {
          const state = stepState(step.done, step.current);
          const Icon = step.icon;
          const isLast = index === steps.length - 1;

          return (
            <li key={step.id} className="relative">
              {!isLast && (
                <span
                  className={`absolute left-[15px] top-9 h-[calc(100%+0.25rem)] w-0.5 ${
                    step.done ? "bg-[#16a34a]" : "bg-gray-200"
                  }`}
                  aria-hidden
                />
              )}
              <div
                className={`relative flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                  state === "current"
                    ? "border-[#1B4FD8]/40 bg-white shadow-sm"
                    : state === "done"
                      ? "border-green-100 bg-white/80"
                      : "border-transparent bg-white/50"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {state === "done" ? (
                    <CheckCircle2 className="h-7 w-7 text-[#16a34a]" />
                  ) : state === "current" ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1B4FD8] text-white">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                  ) : (
                    <Circle className="h-7 w-7 text-gray-300" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                  <p className="text-xs text-gray-500">{step.desc}</p>
                  {(state === "current" || (state === "done" && step.id === "obras")) && (
                    <Link
                      href={step.href as never}
                      className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${
                        state === "current"
                          ? "text-[#1B4FD8] hover:underline"
                          : "text-gray-500 hover:text-[#1B4FD8]"
                      }`}
                    >
                      {step.cta}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

const NAVY = "#0C1A3D";
const MINT = "#4ADE80";
const ROYAL = "#1B4FD8";

export type JourneyStep = {
  id: string;
  title: string;
  description: string;
  href: string;
  done: boolean;
  current: boolean;
};

type Props = {
  steps: JourneyStep[];
};

export function TomadorJourneyWizard({ steps }: Props) {
  const doneCount = steps.filter((s) => s.done).length;
  const current = steps.find((s) => s.current) ?? steps.find((s) => !s.done);
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <section
      className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
      aria-label="Seu caminho no IMOBI"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className="text-xs font-bold uppercase tracking-widest text-gray-400"
            style={{ fontFamily: "'Jost', sans-serif" }}
          >
            Passo a passo
          </p>
          <h2
            className="text-lg font-bold text-gray-900"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Seu crédito em {steps.length} etapas
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {doneCount} de {steps.length} concluídas — siga na ordem abaixo.
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold" style={{ color: ROYAL }}>
            {pct}%
          </span>
          <p className="text-xs text-gray-400">progresso</p>
        </div>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: MINT }}
        />
      </div>

      {current && !current.done && (
        <Link
          href={current.href as "/"}
          className="mb-4 flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-white no-underline"
          style={{ background: NAVY }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
              Próximo passo
            </p>
            <p className="font-semibold">{current.title}</p>
            <p className="text-sm text-white/70">{current.description}</p>
          </div>
          <ArrowRight size={20} className="shrink-0" />
        </Link>
      )}

      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={step.id}>
            <Link
              href={step.href as "/"}
              className={`flex items-start gap-3 rounded-lg px-3 py-2 no-underline transition-colors ${
                step.current
                  ? "bg-blue-50"
                  : step.done
                    ? "opacity-70 hover:bg-gray-50"
                    : "hover:bg-gray-50"
              }`}
            >
              {step.done ? (
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" style={{ color: MINT }} />
              ) : (
                <Circle
                  size={18}
                  className="mt-0.5 shrink-0"
                  style={{ color: step.current ? ROYAL : "#cbd5e1" }}
                />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold ${
                    step.done ? "text-gray-500 line-through" : "text-gray-900"
                  }`}
                >
                  {i + 1}. {step.title}
                </p>
                {!step.done && (
                  <p className="text-xs text-gray-500">{step.description}</p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function buildTomadorJourneySteps(input: {
  kycAprovado: boolean;
  temObra: boolean;
  temCredito: boolean;
  temEtapaLiberada: boolean;
}): JourneyStep[] {
  const { kycAprovado, temObra, temCredito, temEtapaLiberada } = input;

  const steps: Omit<JourneyStep, "current">[] = [
    {
      id: "kyc",
      title: "Enviar documentos (KYC)",
      description: "RG, comprovante e selfie para análise",
      href: "/dashboard/kyc",
      done: kycAprovado,
    },
    {
      id: "obra",
      title: "Cadastrar sua obra",
      description: "Endereço, etapas e valor do projeto",
      href: "/dashboard/obras/nova",
      done: temObra,
    },
    {
      id: "credito",
      title: "Solicitar crédito",
      description: "Simule e envie o pedido vinculado à obra",
      href: "/dashboard/credito/solicitar",
      done: temCredito,
    },
    {
      id: "aprovacao",
      title: "Aguardar aprovação do gestor",
      description: "KYC e etapas são analisados pelo fundo",
      href: "/dashboard/construtor",
      done: temEtapaLiberada,
    },
    {
      id: "acompanhar",
      title: "Acompanhar liberações",
      description: "Veja parcelas e progresso da obra",
      href: "/dashboard/credito",
      done: temEtapaLiberada && temCredito,
    },
  ];

  const firstOpen = steps.findIndex((s) => !s.done);
  return steps.map((s, i) => ({
    ...s,
    current: i === firstOpen,
  }));
}

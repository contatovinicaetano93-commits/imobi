"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SimuladorContent } from "@/components/dashboard/simulador/SimuladorContent";
import { SolicitarCreditoForm } from "@/components/dashboard/credito/SolicitarCreditoForm";
import { TOMADOR_HOME } from "@/lib/tomador-flow";

type CreditoPassoClientProps = {
  solicitar: boolean;
  valorInicial: number;
  prazoInicial: number;
};

function VoltarInicio() {
  return (
    <Link
      href={TOMADOR_HOME}
      className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-[#1B4FD8]"
    >
      <ChevronLeft className="h-4 w-4" />
      Voltar ao início
    </Link>
  );
}

export function CreditoPassoClient({ solicitar, valorInicial, prazoInicial }: CreditoPassoClientProps) {
  if (solicitar) {
    return (
      <div className="mx-auto max-w-5xl pb-10">
        <VoltarInicio />
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1B4FD8]">Passo 4 de 4</p>
          <h1 className="text-2xl font-bold text-gray-900">Solicitar crédito</h1>
          <p className="mt-1 text-sm text-gray-500">Confirme valor e prazo para enviar à análise.</p>
        </div>
        <SolicitarCreditoForm valorInicial={valorInicial} prazoInicial={prazoInicial} />
      </div>
    );
  }

  return (
    <div className="pb-10">
      <VoltarInicio />
      <div className="mx-auto mb-6 max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#1B4FD8]">Passo 4 de 4</p>
        <h1 className="text-2xl font-bold text-gray-900">Simular crédito</h1>
        <p className="mt-1 text-sm text-gray-500">
          Estime a viabilidade e solicite na sequência, se fizer sentido.
        </p>
      </div>
      <SimuladorContent embedded />
    </div>
  );
}

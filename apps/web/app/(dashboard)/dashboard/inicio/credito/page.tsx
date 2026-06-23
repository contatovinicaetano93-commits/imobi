import Link from "next/link";
import { TOMADOR_HOME } from "@/lib/tomador-flow";
import { CreditoPassoClient } from "./credito-passo-client";
import CreditoExtratoPage from "../../credito/page";

type PageProps = {
  searchParams: Promise<{ solicitar?: string; visao?: string; valor?: string; prazo?: string }>;
};

export default async function InicioCreditoPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  if (sp.visao === "extrato") {
    return (
      <div className="mx-auto max-w-4xl space-y-4 pb-10">
        <Link
          href={TOMADOR_HOME}
          className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-[#1B4FD8]"
        >
          ← Voltar ao início
        </Link>
        <CreditoExtratoPage />
      </div>
    );
  }

  return (
    <CreditoPassoClient
      solicitar={sp.solicitar === "1"}
      valorInicial={Number(sp.valor ?? 0)}
      prazoInicial={Number(sp.prazo ?? 0)}
    />
  );
}

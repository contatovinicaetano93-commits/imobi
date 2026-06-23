import { redirect } from "next/navigation";
import { TOMADOR_ROUTES } from "@/lib/tomador-flow";

type Props = {
  searchParams: Promise<{ valor?: string; prazo?: string }>;
};

/** Rota legada → solicitação no fluxo unificado */
export default async function SolicitarCreditoRedirectPage({ searchParams }: Props) {
  const sp = await searchParams;
  const valor = Number(sp.valor ?? 0);
  const prazo = Number(sp.prazo ?? 0);
  redirect(TOMADOR_ROUTES.creditoSolicitar(valor > 0 ? valor : undefined, prazo > 0 ? prazo : undefined));
}

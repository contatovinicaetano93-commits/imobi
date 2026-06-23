import { redirect } from "next/navigation";
import { TOMADOR_ROUTES } from "@/lib/tomador-flow";

/** Rota legada → simulação no fluxo unificado */
export default function SimuladorRedirectPage() {
  redirect(TOMADOR_ROUTES.credito);
}

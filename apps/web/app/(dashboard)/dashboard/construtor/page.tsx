import { redirect } from "next/navigation";
import { TOMADOR_HOME } from "@/lib/tomador-flow";

/** Rota legada — painel unificado em /dashboard/inicio */
export default function ConstrutorRedirectPage() {
  redirect(TOMADOR_HOME);
}

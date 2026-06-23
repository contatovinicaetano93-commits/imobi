import { redirect } from "next/navigation";
import { TOMADOR_ROUTES } from "@/lib/tomador-flow";

type Props = { searchParams: Promise<{ "bem-vindo"?: string }> };

/** Rota legada → passo 1 do fluxo unificado */
export default async function KycRedirectPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = sp["bem-vindo"] === "1" ? "?bem-vindo=1" : "";
  redirect(`${TOMADOR_ROUTES.documentos}${q}`);
}

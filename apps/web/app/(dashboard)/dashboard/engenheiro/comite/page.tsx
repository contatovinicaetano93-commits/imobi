import type { Metadata } from "next";
import { comiteApi, safeArr, type ComiteDigital, type SolicitacaoCredito } from "@/lib/api";
import { EngenheiroComiteClient } from "./_components/EngenheiroComiteClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pareceres Técnicos — Engenheiro" };

type ComiteItem = ComiteDigital & { solicitacao: SolicitacaoCredito };

export default async function EngenheiroComitePage() {
  const comites = safeArr<ComiteItem>(await comiteApi.listar().catch(() => []));
  return <EngenheiroComiteClient comites={comites} />;
}

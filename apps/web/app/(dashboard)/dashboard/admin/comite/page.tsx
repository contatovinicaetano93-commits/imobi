import type { Metadata } from "next";
import { comiteApi, safeArr, type ComiteDigital, type SolicitacaoCredito } from "@/lib/api";
import { AdminComiteClient } from "./_components/AdminComiteClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Comitê Digital — Admin" };

type ComiteItem = ComiteDigital & { solicitacao: SolicitacaoCredito };

export default async function AdminComitePage() {
  const comites = safeArr<ComiteItem>(await comiteApi.listar().catch(() => []));
  return <AdminComiteClient comites={comites} />;
}

import type { Metadata } from "next";
import { comiteApi, type ComiteDigital, type SolicitacaoCredito } from "@/lib/api";
import { GestorComiteClient } from "./_components/GestorComiteClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Acompanhamento de Comitês — Fundo" };

type ComiteItem = ComiteDigital & { solicitacao: SolicitacaoCredito };

export default async function GestorComitePage() {
  const comites = await comiteApi.listar().catch(() => [] as ComiteItem[]);
  return <GestorComiteClient comites={comites as ComiteItem[]} />;
}

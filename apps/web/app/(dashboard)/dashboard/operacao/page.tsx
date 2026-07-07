import type { Metadata } from "next";
import { creditoApi, safeArr, type CreditoResumo } from "@/lib/api";
import { ObrasPageClient } from "../obras/_components/ObrasPageClient";
import { CreditoView } from "../credito/_components/CreditoView";
import { OperacaoTabs } from "./_components/OperacaoTabs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Minha operação — IMOBI" };

export default async function OperacaoPage() {
  const creditos = safeArr<CreditoResumo>(
    await creditoApi.meus().catch(() => [] as CreditoResumo[]),
  );

  return (
    <OperacaoTabs
      obras={<ObrasPageClient />}
      credito={<CreditoView creditos={creditos} />}
    />
  );
}

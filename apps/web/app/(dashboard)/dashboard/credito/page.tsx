import type { Metadata } from "next";
import { creditoApi, safeArr, type CreditoResumo } from "@/lib/api";
import { CreditoView } from "./_components/CreditoView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Crédito — imbobi" };

export default async function CreditoPage() {
  const creditos = safeArr<CreditoResumo>(
    await creditoApi.meus().catch(() => [] as CreditoResumo[]),
  );

  return <CreditoView creditos={creditos} />;
}

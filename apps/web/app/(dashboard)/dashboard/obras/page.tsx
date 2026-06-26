import type { Metadata } from "next";
import { obrasApi, type ObraResumo } from "@/lib/api";
import { ObrasListClient } from "./_components/ObrasListClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Minhas Obras — imbobi" };

export default async function ObrasPage() {
  const obras = await obrasApi.listar().catch(() => [] as ObraResumo[]);
  return <ObrasListClient obras={obras} />;
}

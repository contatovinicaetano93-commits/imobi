import type { Metadata } from "next";
import { ObrasPageClient } from "./_components/ObrasPageClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Obras — IMOBI" };

export default function ObrasPage() {
  return <ObrasPageClient />;
}

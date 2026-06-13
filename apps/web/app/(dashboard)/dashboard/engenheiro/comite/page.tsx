import type { Metadata } from "next";
import { comiteApi } from "@/lib/api";
import { EngenheiroComiteClient } from "./_components/EngenheiroComiteClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pareceres Técnicos — Engenheiro" };

export default async function EngenheiroComitePage() {
  const comites = await comiteApi.listar().catch(() => []);
  return <EngenheiroComiteClient comites={comites} />;
}

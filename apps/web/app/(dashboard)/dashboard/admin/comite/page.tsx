import type { Metadata } from "next";
import { comiteApi } from "@/lib/api";
import { AdminComiteClient } from "./_components/AdminComiteClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Comitê Digital — Admin" };

export default async function AdminComitePage() {
  const comites = await comiteApi.listar().catch(() => []);
  return <AdminComiteClient comites={comites} />;
}

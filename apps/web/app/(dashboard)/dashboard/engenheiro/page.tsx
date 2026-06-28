import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Engenheiro: entrada direta na fila de vistorias (fluxo canônico). */
export default function EngenheiroPage() {
  redirect("/dashboard/engenheiro/vistoria");
}

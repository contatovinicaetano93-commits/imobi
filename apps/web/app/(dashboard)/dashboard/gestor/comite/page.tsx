import { redirect } from "next/navigation";

/** Comitê é processo interno (Admin). Gestor acompanha apenas KPIs no painel. */
export default function GestorComitePage() {
  redirect("/dashboard/gestor");
}

import { redirect } from "next/navigation";

/** @deprecated Use /dashboard/gestor/fundos */
export default function FundosLegacyRedirect() {
  redirect("/dashboard/gestor/fundos");
}

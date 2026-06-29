import type { Route } from "next";

export type KycFilaContext = "admin" | "gestor";

export function kycListHref(context: KycFilaContext): Route {
  return (context === "admin" ? "/dashboard/admin/kyc" : "/dashboard/gestor") as Route;
}

export function kycDetailHref(context: KycFilaContext, id: string): Route {
  if (context === "gestor") return "/dashboard/gestor" as Route;
  return `${kycListHref(context)}/${id}` as Route;
}

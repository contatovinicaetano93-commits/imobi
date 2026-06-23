import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TOMADOR_HOME } from "@/lib/tomador-flow";
export const dynamic = "force-dynamic";

function decodeRole(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(
      Buffer.from(base64 + "===".slice(0, (4 - (base64.length % 4)) % 4), "base64").toString("utf-8"),
    ) as { role?: string; exp?: number };
    if (json.exp && json.exp < Math.floor(Date.now() / 1000)) return "__expired__";
    return json.role ?? null;
  } catch {
    return null;
  }
}

function homeForRole(role: string | null): string {
  switch (role) {
    case "ADMIN":
      return "/dashboard/admin";
    case "GESTOR":
    case "GESTOR_FUNDO":
      return "/dashboard/gestor";
    case "ENGENHEIRO":
    case "GESTOR_OBRA":
      return "/dashboard/engenheiro";
    case "COMERCIAL":
    case "PARCEIRO":
      return "/dashboard/comercial";
    case "CONSTRUTOR":
    case "TOMADOR":
      return TOMADOR_HOME;
    default:
      return "/login";
  }
}

/** Legacy `/dashboard` URL — always send users to their role home. */
export default async function DashboardPage() {
  const token = (await cookies()).get("access_token")?.value;
  if (!token) redirect("/login");
  const role = decodeRole(token);
  if (role === "__expired__" || !role) redirect("/login");
  redirect(homeForRole(role));
}

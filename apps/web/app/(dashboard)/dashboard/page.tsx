import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { normalizeRole, ROLE_HOME } from "@/lib/role-permissions";

export const dynamic = "force-dynamic";

function decodeRole(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(
      base64 + "===".slice(0, (4 - (base64.length % 4)) % 4),
      "base64",
    ).toString("utf-8");
    const data = JSON.parse(json) as { role?: string; exp?: number };
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;
    return data.role ?? null;
  } catch {
    return null;
  }
}

/** Hub único: redireciona cada perfil para o passo canônico da jornada. */
export default async function DashboardPage() {
  const jar = await cookies();
  const token = jar.get("access_token")?.value;
  if (!token) redirect("/login");

  const role = normalizeRole(decodeRole(token));
  const home = role ? (ROLE_HOME[role] ?? "/dashboard/cliente") : "/dashboard/cliente";
  redirect(home);
}

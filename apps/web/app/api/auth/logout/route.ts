import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_URL = (() => {
  const base = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";
  return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
})();

export async function POST() {
  const jar = await cookies();
  const refreshToken = jar.get("refresh_token")?.value;

  if (refreshToken) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    } catch { /* invalida sessão local mesmo se backend indisponível */ }
  }

  jar.delete("access_token");
  jar.delete("refresh_token");
  return NextResponse.json({ ok: true });
}

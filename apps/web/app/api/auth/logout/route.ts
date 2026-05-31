import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get("access_token")?.value;

  if (token) {
    try {
      const apiUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";
      await fetch(`${apiUrl}/api/v1/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {
        // Proceed with logout even if API call fails
      });
    } catch {
      // Silently fail on API call
    }
  }

  jar.delete("access_token");
  jar.delete("refresh_token");

  return NextResponse.json({ ok: true });
}

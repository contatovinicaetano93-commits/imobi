import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get("access_token")?.value;

  if (token) {
    const apiUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";
    try {
      const res = await fetch(`${apiUrl}/api/v1/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error(`Logout API failed: ${res.status} ${res.statusText}`);
      }
    } catch (error) {
      console.error(`Logout API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  jar.delete("access_token");
  jar.delete("refresh_token");

  return NextResponse.json({ ok: true });
}

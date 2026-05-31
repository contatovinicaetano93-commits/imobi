import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const jar = await cookies();
    const token = jar.get("access_token")?.value;

    if (!token) {
      return NextResponse.json(null, { status: 401 });
    }

    const apiUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";
    const res = await fetch(`${apiUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return NextResponse.json(null, { status: 401 });
    }

    const user = await res.json();
    return NextResponse.json(user);
  } catch {
    return NextResponse.json(null, { status: 500 });
  }
}

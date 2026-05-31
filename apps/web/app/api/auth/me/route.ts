import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

    if (res.status === 401) {
      return NextResponse.json(null, { status: 401 });
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch user" },
        { status: 500 }
      );
    }

    const user = await res.json();
    return NextResponse.json(user);
  } catch (error) {
    console.error("Auth session fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

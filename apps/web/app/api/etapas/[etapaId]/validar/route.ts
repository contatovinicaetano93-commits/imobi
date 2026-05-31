import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ etapaId: string }> }
) {
  const { etapaId } = await params;
  const jar = await cookies();
  const token = jar.get("access_token")?.value;

  const body = await req.json() as unknown;

  const res = await fetch(`${API_URL}/api/v1/etapas/${etapaId}/aprovar`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

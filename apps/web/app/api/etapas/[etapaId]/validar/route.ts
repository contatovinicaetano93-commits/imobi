import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getApiV1Url } from "@/lib/api-base";

const API_URL = getApiV1Url();

export async function PATCH(
  req: Request,
  { params }: { params: { etapaId: string } }
) {
  const jar = await cookies();
  const token = jar.get("access_token")?.value;

  const body = await req.json() as unknown;

  const res = await fetch(`${API_URL}/etapas/${params.etapaId}/aprovar`, {
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

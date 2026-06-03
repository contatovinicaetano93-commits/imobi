import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

export async function PATCH(
  req: Request,
  { params }: { params: { etapaId: string } }
) {
  const jar = await cookies();
  const token = jar.get("access_token")?.value;

  const body = await req.json() as { aprovado?: boolean; observacao?: string };
  const { aprovado, observacao } = body;

  const nestPath = aprovado !== false
    ? `/api/v1/manager/etapas/${params.etapaId}/aprovar`
    : `/api/v1/manager/etapas/${params.etapaId}/rejeitar`;

  const res = await fetch(`${API_URL}${nestPath}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(aprovado !== false
      ? { observacao }
      : { motivo: observacao }),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getApiV1Url } from "@/lib/api-base";

const API_URL = getApiV1Url();

type ValidarEtapaBody = {
  aprovado?: boolean;
  observacao?: string;
  motivo?: string;
};

export async function PATCH(
  req: Request,
  { params }: { params: { etapaId: string } }
) {
  const jar = await cookies();
  const token = jar.get("access_token")?.value;

  const body = await req.json() as ValidarEtapaBody;
  const aprovado = body.aprovado !== false;
  const upstreamPath = aprovado ? "aprovar" : "rejeitar";
  const upstreamBody = aprovado
    ? { observacao: body.observacao }
    : { motivo: body.motivo ?? body.observacao ?? "Reprovado pelo gestor." };

  const res = await fetch(`${API_URL}/etapas/${params.etapaId}/${upstreamPath}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(upstreamBody),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getApiV1Url } from "@/lib/api-base";

export const dynamic = "force-dynamic";

const API_URL = getApiV1Url();

type ValidarBody = {
  observacao?: string;
  aprovado?: boolean;
};

export async function PATCH(
  req: Request,
  { params }: { params: { etapaId: string } }
) {
  const jar = await cookies();
  const token = jar.get("access_token")?.value;

  const body = (await req.json()) as ValidarBody;
  const aprovar = body.aprovado !== false;
  const action = aprovar ? "aprovar" : "rejeitar";
  const payload = aprovar
    ? { observacao: body.observacao }
    : { motivo: body.observacao?.trim() || "Reprovado na vistoria" };

  const res = await fetch(`${API_URL}/etapas/${params.etapaId}/${action}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

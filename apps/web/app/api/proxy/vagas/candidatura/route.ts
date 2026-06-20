import { NextRequest, NextResponse } from "next/server";
import { CandidaturaVagaSchema } from "@imbobi/schemas";

const _base = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";
const API = _base.endsWith("/api/v1") ? _base : `${_base}/api/v1`;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  const parsed = CandidaturaVagaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados inválidos.", errors: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const res = await fetch(`${API}/vagas/candidatura`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
    cache: "no-store",
  }).catch(() => null);

  if (!res) return NextResponse.json({ message: "Serviço indisponível." }, { status: 503 });

  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    return NextResponse.json(
      { message: data.message ?? "Erro ao registrar candidatura." },
      { status: res.status },
    );

  return NextResponse.json({ ok: true, candidaturaId: data.candidaturaId });
}

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { nome, localizacao, valor, tipo, prazo } = await req.json();

  if (!nome || !valor || !tipo) {
    return NextResponse.json({ error: "Campos obrigatórios" }, { status: 400 });
  }

  // TODO: Integrar com NestJS backend
  const obraId = Math.random().toString(36).slice(2);

  return NextResponse.json({
    success: true,
    obraId,
    nome,
    status: "EM_ANALISE",
    progresso: 0,
  });
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    obras: [
      {
        id: "obra-1",
        nome: "Residencial Park Avenue",
        local: "São Paulo, SP",
        valor: 5000000,
        progresso: 65,
        status: "EM_ACOMPANHAMENTO",
      },
    ],
  });
}

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { nome, email, cnpj, tipoObra } = await req.json();

  if (!nome || !email || !cnpj) {
    return NextResponse.json({ error: "Campos obrigatórios" }, { status: 400 });
  }

  // TODO: Integrar com NestJS backend para persistência
  const userId = Math.random().toString(36).slice(2);
  const token = Buffer.from(`${userId}:${Date.now()}`).toString("base64");

  const response = NextResponse.json({
    success: true,
    userId,
    message: "KYC iniciado com sucesso",
  });

  response.cookies.set("access_token", token, {
    httpOnly: true,
    maxAge: 86400 * 7,
  });

  return response;
}

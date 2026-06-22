import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const _base = process.env["NEXT_PUBLIC_API_URL"] ?? process.env["API_URL"] ?? "http://localhost:4000";
const API = _base.endsWith("/api/v1") ? _base : `${_base}/api/v1`;

export async function POST(req: NextRequest) {
  const token = (await cookies()).get("access_token")?.value;
  const formData = await req.formData();

  const res = await fetch(`${API}/kyc/upload-arquivo`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
    cache: "no-store",
  }).catch(() => null);

  if (!res) return NextResponse.json({ message: "API inacessível" }, { status: 503 });

  const text = await res.text();
  return new NextResponse(text || null, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getApiV1Url } from "@/lib/api-base";

const API = getApiV1Url();

export async function POST(req: NextRequest) {
  const token = (await cookies()).get("access_token")?.value;
  const formData = await req.formData();

  const res = await fetch(`${API}/kyc/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
    cache: "no-store",
  }).catch(() => null);

  if (!res) {
    return NextResponse.json({ message: "API inacessível" }, { status: 503 });
  }

  const text = await res.text();
  return new NextResponse(text || null, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
}

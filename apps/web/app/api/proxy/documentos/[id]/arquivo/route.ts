import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getApiV1Url } from "@/lib/api-base";

const API = getApiV1Url();

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const token = (await cookies()).get("access_token")?.value;

  const res = await fetch(`${API}/documentos/${id}/arquivo`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    redirect: "manual",
    cache: "no-store",
  }).catch(() => null);

  if (!res) {
    return NextResponse.json({ message: "API inacessível" }, { status: 503 });
  }

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location");
    if (location) return NextResponse.redirect(location);
  }

  const body = await res.arrayBuffer();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}

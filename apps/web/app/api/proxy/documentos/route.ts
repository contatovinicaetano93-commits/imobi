import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchApiWithRetry } from "@/lib/fetch-api-with-retry";

export async function POST(req: NextRequest) {
  const token = (await cookies()).get("access_token")?.value;
  const formData = await req.formData();

  const res = await fetchApiWithRetry({
    path: "/documentos",
    method: "POST",
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    wakeFirst: true,
  });

  if (!res) {
    return NextResponse.json({ message: "API inacessível" }, { status: 503 });
  }

  const text = await res.text();
  return new NextResponse(text || null, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
}

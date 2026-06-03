import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

const UPSTREAM = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api/v1";

async function proxy(req: NextRequest, params: { path: string[] }) {
  const jar = await cookies();
  const token = jar.get("access_token")?.value;

  const upstreamPath = params.path.join("/");
  const search = req.nextUrl.search ?? "";
  const url = `${UPSTREAM}/${upstreamPath}${search}`;

  const upstreamHeaders = new Headers();
  upstreamHeaders.set("Content-Type", "application/json");
  if (token) upstreamHeaders.set("Authorization", `Bearer ${token}`);

  const body =
    req.method !== "GET" && req.method !== "HEAD"
      ? await req.text()
      : undefined;

  const res = await fetch(url, {
    method: req.method,
    headers: upstreamHeaders,
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params);
}
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params);
}
export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params);
}
export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params);
}
export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params);
}

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { urlDeUpload } from "@/lib/server/storage";
import { jsonError } from "@/lib/server/errors";

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const { prefixo, contentType } = await req.json();
    const result = await urlDeUpload(prefixo, contentType);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}

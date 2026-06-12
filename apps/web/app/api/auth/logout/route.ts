import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const jar = await cookies();
  jar.delete("access_token");
  jar.delete("refresh_token");
  return NextResponse.redirect(new URL("/login", req.url));
}

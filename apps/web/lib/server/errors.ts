import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  if (isZodError(error)) {
    return NextResponse.json(
      { message: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`) },
      { status: 400 },
    );
  }
  console.error(error);
  return NextResponse.json({ message: "Erro interno." }, { status: 500 });
}

function isZodError(error: unknown): error is ZodError {
  return typeof error === "object" && error !== null && "issues" in error && "errors" in error;
}

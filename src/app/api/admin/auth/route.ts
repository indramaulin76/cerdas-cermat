import { NextResponse, type NextRequest } from "next/server";

import type {
  AdminAuthResponse,
  AdminLoginRequest,
  ApiErrorResponse,
} from "@/lib/ccl/api";
import {
  ADMIN_COOKIE_NAME,
  adminCookieOptions,
  createAdminToken,
  isAdminAuthenticated,
  verifyAdminPassword,
} from "@/server/admin-auth";

function errorResponse(error: string, message: string, status: number) {
  return NextResponse.json<ApiErrorResponse>(
    { ok: false, error, message },
    { status },
  );
}

/** Status masuk panitia saat ini. */
export async function GET() {
  const authenticated = await isAdminAuthenticated();
  const response: AdminAuthResponse = { ok: true, authenticated };
  return NextResponse.json(response);
}

/** Masuk sebagai panitia dengan kata sandi bersama. */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_json", "Body permintaan harus JSON.", 400);
  }

  if (typeof body !== "object" || body === null) {
    return errorResponse("invalid_body", "Body permintaan tidak valid.", 400);
  }

  const { password } = body as Partial<AdminLoginRequest>;

  if (typeof password !== "string" || password.trim() === "") {
    return errorResponse("invalid_password", "Kata sandi wajib diisi.", 400);
  }

  if (!verifyAdminPassword(password)) {
    return errorResponse("invalid_password", "Kata sandi panitia salah.", 401);
  }

  const response: AdminAuthResponse = { ok: true, authenticated: true };
  const result = NextResponse.json(response);
  result.cookies.set(ADMIN_COOKIE_NAME, createAdminToken(), adminCookieOptions());
  return result;
}

/** Keluar: hapus cookie panitia. */
export async function DELETE() {
  const response: AdminAuthResponse = { ok: true, authenticated: false };
  const result = NextResponse.json(response);
  result.cookies.set(ADMIN_COOKIE_NAME, "", {
    ...adminCookieOptions(),
    maxAge: 0,
  });
  return result;
}

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
  getCurrentAdmin,
  verifyAdminCredentials,
} from "@/server/admin-auth";

function errorResponse(error: string, message: string, status: number) {
  return NextResponse.json<ApiErrorResponse>(
    { ok: false, error, message },
    { status },
  );
}

/** Status masuk panitia saat ini. */
export async function GET() {
  const admin = await getCurrentAdmin();
  const response: AdminAuthResponse = {
    ok: true,
    authenticated: admin !== null,
    admin,
  };
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

  const { email, password } = body as Partial<AdminLoginRequest>;

  if (
    typeof email !== "string" ||
    email.trim() === "" ||
    typeof password !== "string" ||
    password === ""
  ) {
    return errorResponse(
      "invalid_credentials",
      "Email dan kata sandi wajib diisi.",
      400,
    );
  }

  const admin = await verifyAdminCredentials(email, password);
  if (!admin) {
    return errorResponse(
      "invalid_credentials",
      "Email atau kata sandi salah.",
      401,
    );
  }

  const response: AdminAuthResponse = {
    ok: true,
    authenticated: true,
    admin,
  };
  const result = NextResponse.json(response);
  result.cookies.set(
    ADMIN_COOKIE_NAME,
    createAdminToken(admin.id),
    adminCookieOptions(),
  );
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

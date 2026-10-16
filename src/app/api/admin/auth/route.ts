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
  verifyAdminPin,
  type AdminIdentity,
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

/** Masuk sebagai panitia dengan PIN bootstrap. */
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

  const pin = (body as Partial<AdminLoginRequest>).pin;

  if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
    return errorResponse(
      "invalid_credentials",
      "PIN harus terdiri dari 4 angka.",
      400,
    );
  }

  let admin: AdminIdentity | null;
  try {
    admin = verifyAdminPin(pin);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Konfigurasi login belum lengkap.";
    return errorResponse("login_not_configured", message, 503);
  }
  if (!admin) {
    return errorResponse("invalid_credentials", "PIN salah.", 401);
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

import { NextResponse, type NextRequest } from "next/server";

import type { ApiErrorResponse, RoleAuthResponse } from "@/lib/ccl/api";
import type { RoleId } from "@/lib/ccl/roles";
import {
  createRoleToken,
  isRoleId,
  isRoleAuthenticated,
  ROLE_COOKIE_MAX_AGE,
  ROLE_PIN_LABEL,
  roleCookieName,
  verifyRolePin,
} from "@/server/auth";

type RouteParams = {
  params: Promise<{ sessionId: string; role: string }>;
};

function errorResponse(error: string, message: string, status: number) {
  return NextResponse.json<ApiErrorResponse>(
    { ok: false, error, message },
    { status },
  );
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: ROLE_COOKIE_MAX_AGE,
  };
}

/** Ambil peran valid dari URL, atau `null` bila tak dikenal. */
function parseRole(role: string): RoleId | null {
  return isRoleId(role) ? role : null;
}

/**
 * Cek status autentikasi sebuah peran sesi saat ini.
 *
 * `GET /api/sessions/[sessionId]/auth/[role]` — role: moderator|viewer|team
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { sessionId, role: roleParam } = await params;

  if (!sessionId) {
    return errorResponse("invalid_session", "Session id wajib diisi.", 400);
  }

  const role = parseRole(roleParam);
  if (!role) {
    return errorResponse("invalid_role", "Peran tidak dikenal.", 400);
  }

  const authenticated = await isRoleAuthenticated(sessionId, role);
  const response: RoleAuthResponse = { ok: true, authenticated };
  return NextResponse.json(response);
}

/**
 * Masuk sebagai sebuah peran dengan PIN-nya.
 *
 * `POST /api/sessions/[sessionId]/auth/[role]`
 * Body: `{ pin }`
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { sessionId, role: roleParam } = await params;

  if (!sessionId) {
    return errorResponse("invalid_session", "Session id wajib diisi.", 400);
  }

  const role = parseRole(roleParam);
  if (!role) {
    return errorResponse("invalid_role", "Peran tidak dikenal.", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_json", "Body permintaan harus JSON.", 400);
  }

  if (typeof body !== "object" || body === null) {
    return errorResponse("invalid_body", "Body permintaan tidak valid.", 400);
  }

  const { pin } = body as { pin?: unknown };

  if (typeof pin !== "string" || pin.trim() === "") {
    return errorResponse("invalid_pin", "PIN wajib diisi.", 400);
  }

  const check = await verifyRolePin(sessionId, role, pin);

  if (check === "no_session") {
    return errorResponse(
      "unknown_session",
      `Sesi "${sessionId}" tidak ditemukan.`,
      404,
    );
  }

  if (check === "no_pin") {
    return errorResponse(
      "pin_not_set",
      `Sesi ini belum memiliki PIN ${ROLE_PIN_LABEL[role]}.`,
      409,
    );
  }

  if (check === "wrong") {
    return errorResponse("invalid_pin", `PIN ${ROLE_PIN_LABEL[role]} salah.`, 401);
  }

  const response: RoleAuthResponse = { ok: true, authenticated: true };
  const result = NextResponse.json(response);
  result.cookies.set(
    roleCookieName(sessionId, role),
    createRoleToken(sessionId, role),
    cookieOptions(),
  );
  return result;
}

/** Keluar: hapus cookie peran ini. */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { sessionId, role: roleParam } = await params;

  const role = parseRole(roleParam);
  if (!role) {
    return errorResponse("invalid_role", "Peran tidak dikenal.", 400);
  }

  const response: RoleAuthResponse = { ok: true, authenticated: false };
  const result = NextResponse.json(response);
  result.cookies.set(roleCookieName(sessionId, role), "", {
    ...cookieOptions(),
    maxAge: 0,
  });
  return result;
}

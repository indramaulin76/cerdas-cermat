import { NextResponse, type NextRequest } from "next/server";

import type { ApiErrorResponse, ModeratorAuthResponse } from "@/lib/ccl/api";
import {
  createModeratorToken,
  isModeratorAuthenticated,
  moderatorCookieName,
  MODERATOR_COOKIE_MAX_AGE,
  verifyModeratorPin,
} from "@/server/auth";

type RouteParams = { params: Promise<{ sessionId: string }> };

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
    maxAge: MODERATOR_COOKIE_MAX_AGE,
  };
}

/** Cek status autentikasi moderator saat ini. */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;

  if (!sessionId) {
    return errorResponse("invalid_session", "Session id wajib diisi.", 400);
  }

  const authenticated = await isModeratorAuthenticated(sessionId);
  const response: ModeratorAuthResponse = { ok: true, authenticated };
  return NextResponse.json(response);
}

/** Masuk sebagai moderator dengan PIN. */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;

  if (!sessionId) {
    return errorResponse("invalid_session", "Session id wajib diisi.", 400);
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

  const check = verifyModeratorPin(sessionId, pin);

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
      "Sesi ini belum memiliki PIN moderator.",
      409,
    );
  }

  if (check === "wrong") {
    return errorResponse("invalid_pin", "PIN moderator salah.", 401);
  }

  const response: ModeratorAuthResponse = { ok: true, authenticated: true };
  const result = NextResponse.json(response);
  result.cookies.set(
    moderatorCookieName(sessionId),
    createModeratorToken(sessionId),
    cookieOptions(),
  );
  return result;
}

/** Keluar: hapus cookie moderator. */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;

  const response: ModeratorAuthResponse = { ok: true, authenticated: false };
  const result = NextResponse.json(response);
  result.cookies.set(moderatorCookieName(sessionId), "", {
    ...cookieOptions(),
    maxAge: 0,
  });
  return result;
}

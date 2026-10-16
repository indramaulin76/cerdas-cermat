import { NextResponse, type NextRequest } from "next/server";

import type { ApiErrorResponse, ViewerAuthResponse } from "@/lib/ccl/api";
import {
  createViewerToken,
  isViewerAuthenticated,
  VIEWER_COOKIE_MAX_AGE,
  verifyViewerPin,
  viewerCookieName,
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
    maxAge: VIEWER_COOKIE_MAX_AGE,
  };
}

/** Cek status autentikasi penonton saat ini. */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;

  if (!sessionId) {
    return errorResponse("invalid_session", "Session id wajib diisi.", 400);
  }

  const authenticated = await isViewerAuthenticated(sessionId);
  const response: ViewerAuthResponse = { ok: true, authenticated };
  return NextResponse.json(response);
}

/** Masuk sebagai penonton dengan PIN. */
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

  const check = verifyViewerPin(sessionId, pin);

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
      "Sesi ini belum memiliki PIN layar penonton.",
      409,
    );
  }

  if (check === "wrong") {
    return errorResponse("invalid_pin", "PIN layar penonton salah.", 401);
  }

  const response: ViewerAuthResponse = { ok: true, authenticated: true };
  const result = NextResponse.json(response);
  result.cookies.set(
    viewerCookieName(sessionId),
    createViewerToken(sessionId),
    cookieOptions(),
  );
  return result;
}

/** Keluar: hapus cookie penonton. */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;

  const response: ViewerAuthResponse = { ok: true, authenticated: false };
  const result = NextResponse.json(response);
  result.cookies.set(viewerCookieName(sessionId), "", {
    ...cookieOptions(),
    maxAge: 0,
  });
  return result;
}

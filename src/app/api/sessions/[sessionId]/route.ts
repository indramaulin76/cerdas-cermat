import { NextResponse, type NextRequest } from "next/server";

import type {
  ApiErrorResponse,
  SessionDetailResponse,
} from "@/lib/ccl/api";
import { requireAdmin } from "@/server/admin-auth";
import { getSession, toSessionDetailDto } from "@/server/session";

type RouteParams = { params: Promise<{ sessionId: string }> };

function errorResponse(error: string, message: string, status: number) {
  return NextResponse.json<ApiErrorResponse>(
    { ok: false, error, message },
    { status },
  );
}

/**
 * Detail satu sesi untuk halaman admin.
 *
 * `GET /api/sessions/[sessionId]`
 *
 * Hanya panitia (admin) yang sudah masuk. Mengembalikan pengaturan lomba serta
 * link dan PIN tiap peran, sehingga admin bisa membuka ulang sesi kapan saja
 * dengan link & PIN yang sama.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;

  if (!sessionId) {
    return errorResponse("invalid_session", "Session id wajib diisi.", 400);
  }

  const gate = await requireAdmin();
  if (!gate.ok) {
    return errorResponse(gate.error, gate.message, gate.status);
  }

  const row = getSession(sessionId);
  if (!row) {
    return errorResponse(
      "unknown_session",
      `Sesi "${sessionId}" tidak ditemukan.`,
      404,
    );
  }

  const response: SessionDetailResponse = {
    ok: true,
    session: toSessionDetailDto(row),
  };
  return NextResponse.json(response);
}

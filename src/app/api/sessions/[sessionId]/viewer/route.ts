import { NextResponse, type NextRequest } from "next/server";

import type { ApiErrorResponse, ViewerDataResponse } from "@/lib/ccl/api";
import { requireViewer } from "@/server/auth";
import { getSession, toSessionDto } from "@/server/session";
import { listTeams, toTeamDto } from "@/server/team";

type RouteParams = { params: Promise<{ sessionId: string }> };

function errorResponse(error: string, message: string, status: number) {
  return NextResponse.json<ApiErrorResponse>(
    { ok: false, error, message },
    { status },
  );
}

/**
 * Data sesi & regu untuk layar penonton.
 *
 * `GET /api/sessions/[sessionId]/viewer`
 *
 * Mengembalikan pengaturan sesi (judul, waktu jawab, poin) beserta seluruh regu
 * dan skor terkini, supaya layar penonton bisa langsung menggambar papan skor
 * sebelum aliran realtime masuk. Bila layar penonton diberi PIN, akses wajib
 * memakai cookie penonton.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;

  if (!sessionId) {
    return errorResponse("invalid_session", "Session id wajib diisi.", 400);
  }

  const gate = await requireViewer(sessionId);
  if (!gate.ok) {
    return errorResponse(gate.error, gate.message, gate.status);
  }

  const session = getSession(sessionId);
  if (!session) {
    return errorResponse(
      "unknown_session",
      `Sesi "${sessionId}" tidak ditemukan.`,
      404,
    );
  }

  const response: ViewerDataResponse = {
    ok: true,
    session: toSessionDto(session),
    teams: listTeams(sessionId).map(toTeamDto),
  };
  return NextResponse.json(response);
}

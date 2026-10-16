import { NextResponse, type NextRequest } from "next/server";

import type { ApiErrorResponse, TeamsResponse } from "@/lib/ccl/api";
import { listTeams, toTeamDto } from "@/server/team";

type RouteParams = { params: Promise<{ sessionId: string }> };

/**
 * Daftar regu sebuah sesi beserta skor terkini.
 *
 * `GET /api/sessions/[sessionId]/teams`
 *
 * Dipakai moderator dan layar penonton untuk menampilkan papan skor.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;

  if (!sessionId) {
    return NextResponse.json<ApiErrorResponse>(
      { ok: false, error: "invalid_session", message: "Session id wajib diisi." },
      { status: 400 },
    );
  }

  const response: TeamsResponse = {
    ok: true,
    teams: listTeams(sessionId).map(toTeamDto),
  };
  return NextResponse.json(response);
}

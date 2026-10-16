import { NextResponse, type NextRequest } from "next/server";

import type { ApiErrorResponse, RoundStatusResponse } from "@/lib/ccl/api";
import { toBuzzEventDto } from "@/server/buzz";
import { getRoundStatus, toRoundDto } from "@/server/round";

type RouteParams = { params: Promise<{ sessionId: string }> };

/**
 * Status soal/ronde sesi untuk dashboard moderator.
 *
 * `GET /api/sessions/[sessionId]/round/status`
 *
 * Mengembalikan fase soal (idle/open/locked), ronde aktif, dan urutan jawab
 * terkini supaya moderator tahu kapan soal terbuka dan siapa yang tercepat.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;

  if (!sessionId) {
    return NextResponse.json<ApiErrorResponse>(
      { ok: false, error: "invalid_session", message: "Session id wajib diisi." },
      { status: 400 },
    );
  }

  const status = getRoundStatus(sessionId);
  const response: RoundStatusResponse = {
    ok: true,
    phase: status.phase,
    round: status.round ? toRoundDto(status.round) : null,
    ranking: status.ranking.map(toBuzzEventDto),
    winner: status.winner ? toBuzzEventDto(status.winner) : null,
  };
  return NextResponse.json(response);
}

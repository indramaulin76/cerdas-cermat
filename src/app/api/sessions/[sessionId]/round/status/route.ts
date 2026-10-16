import { NextResponse, type NextRequest } from "next/server";

import type { ApiErrorResponse, RoundStatusResponse } from "@/lib/ccl/api";
import { toBuzzEventDto } from "@/server/buzz";
import { getRoundStatus, toRoundDto } from "@/server/round";
import { getSession } from "@/server/session";
import { requireModerator } from "@/server/auth";

type RouteParams = { params: Promise<{ sessionId: string }> };

/**
 * Status soal/ronde sesi untuk dashboard moderator.
 *
 * `GET /api/sessions/[sessionId]/round/status`
 *
 * Mengembalikan fase soal, ronde aktif, urutan buzz, dan durasi menjawab.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;

  if (!sessionId) {
    return NextResponse.json<ApiErrorResponse>(
      { ok: false, error: "invalid_session", message: "Session id wajib diisi." },
      { status: 400 },
    );
  }
  const gate = await requireModerator(sessionId);
  if (!gate.ok) {
    return NextResponse.json<ApiErrorResponse>(
      { ok: false, error: gate.error, message: gate.message },
      { status: gate.status },
    );
  }

  const [status, session] = await Promise.all([
    getRoundStatus(sessionId),
    getSession(sessionId),
  ]);
  const response: RoundStatusResponse = {
    ok: true,
    phase: status.phase,
    round: status.round ? toRoundDto(status.round) : null,
    ranking: status.ranking.map(toBuzzEventDto),
    winner: status.winner ? toBuzzEventDto(status.winner) : null,
    cooldownSeconds: session?.cooldownSeconds ?? 10,
    serverTime: new Date().toISOString(),
  };
  return NextResponse.json(response);
}

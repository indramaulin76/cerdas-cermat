import { NextResponse, type NextRequest } from "next/server";

import type { ApiErrorResponse } from "@/lib/ccl/api";
import { requireModerator } from "@/server/auth";
import { publish } from "@/server/events";
import { resetRound } from "@/server/round";

type RouteParams = { params: Promise<{ sessionId: string }> };

function errorResponse(error: string, message: string, status: number) {
  return NextResponse.json<ApiErrorResponse>({ ok: false, error, message }, { status });
}

/** Endpoint lama tetap mengembalikan ronde ke Standby. */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;
  if (!sessionId) {
    return errorResponse("invalid_session", "Session id wajib diisi.", 400);
  }

  const gate = await requireModerator(sessionId);
  if (!gate.ok) return errorResponse(gate.error, gate.message, gate.status);

  const outcome = resetRound(sessionId);
  publish(sessionId, {
    type: "round.reset",
    at: new Date().toISOString(),
    roundId: outcome.closed?.id ?? null,
  });
  publish(sessionId, {
    type: "highlight.updated",
    at: new Date().toISOString(),
    highlight: { teamId: null, event: null },
  });
  return NextResponse.json({ ok: true, closedRoundId: outcome.closed?.id ?? null });
}

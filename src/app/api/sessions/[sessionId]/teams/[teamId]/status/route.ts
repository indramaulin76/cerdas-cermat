import { NextResponse, type NextRequest } from "next/server";

import type { ApiErrorResponse, TeamStatusResponse } from "@/lib/ccl/api";
import { requireTeam } from "@/server/auth";
import { getTeamStatus } from "@/server/status";

type RouteParams = { params: Promise<{ sessionId: string; teamId: string }> };

function errorResponse(error: string, message: string, status: number) {
  return NextResponse.json<ApiErrorResponse>(
    { ok: false, error, message },
    { status },
  );
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { sessionId, teamId } = await params;

  if (!sessionId || !teamId) {
    return errorResponse("invalid_params", "Session id dan team id wajib diisi.", 400);
  }
  const gate = await requireTeam(sessionId);
  if (!gate.ok) return errorResponse(gate.error, gate.message, gate.status);

  const outcome = await getTeamStatus({ sessionId, teamId });

  if (outcome.status === "unknown_team") {
    return errorResponse(
      "unknown_team",
      `Regu "${outcome.teamId}" tidak ditemukan pada sesi ini.`,
      404,
    );
  }

  const response: TeamStatusResponse = {
    ok: true,
    teamId,
    sessionId,
    roundId: outcome.roundId,
    locked: outcome.locked,
    buzzed: outcome.buzzed,
    isFirst: outcome.isFirst,
    reactionMs: outcome.reactionMs,
    order: outcome.order,
  };
  return NextResponse.json(response);
}

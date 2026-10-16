import { NextResponse, type NextRequest } from "next/server";

import type { OpenRoundResponse, ApiErrorResponse } from "@/lib/ccl/api";
import { requireModerator } from "@/server/auth";
import { publish } from "@/server/events";
import { openRound, toRoundDto } from "@/server/round";

type RouteParams = { params: Promise<{ sessionId: string }> };

function errorResponse(error: string, message: string, status: number) {
  return NextResponse.json<ApiErrorResponse>(
    { ok: false, error, message },
    { status },
  );
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;

  if (!sessionId) {
    return errorResponse("invalid_session", "Session id wajib diisi.", 400);
  }

  // Aksi khusus moderator: bila sesi ber-PIN, cookie moderator wajib ada.
  const gate = await requireModerator(sessionId);
  if (!gate.ok) {
    return errorResponse(gate.error, gate.message, gate.status);
  }

  const outcome = openRound({ sessionId });
  const round = toRoundDto(outcome.row);
  const response: OpenRoundResponse = {
    ok: true,
    round,
  };

  // Siarkan ke semua HP regu (mulai aba-aba) dan moderator/layar penonton.
  publish(sessionId, {
    type: "round.opened",
    at: new Date().toISOString(),
    round,
  });

  return NextResponse.json(response, { status: 201 });
}

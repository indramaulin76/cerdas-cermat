import { NextResponse, type NextRequest } from "next/server";

import type { OpenRoundResponse, ApiErrorResponse } from "@/lib/ccl/api";
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

  const outcome = openRound({ sessionId });
  const response: OpenRoundResponse = {
    ok: true,
    round: toRoundDto(outcome.row),
  };
  return NextResponse.json(response, { status: 201 });
}

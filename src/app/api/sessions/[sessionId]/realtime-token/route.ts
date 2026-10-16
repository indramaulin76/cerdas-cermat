import { NextResponse, type NextRequest } from "next/server";

import type { ApiErrorResponse } from "@/lib/ccl/api";
import { requireAnyRole, requireViewer } from "@/server/auth";
import { createSessionTokenRequest } from "@/server/events";

type RouteParams = { params: Promise<{ sessionId: string }> };

function errorResponse(error: string, message: string, status: number) {
  return NextResponse.json<ApiErrorResponse>(
    { ok: false, error, message },
    { status },
  );
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;
  const audience = request.nextUrl.searchParams.get("audience");
  if (!sessionId || (audience !== "live" && audience !== "viewer")) {
    return errorResponse("invalid_request", "Sesi atau kanal realtime tidak valid.", 400);
  }

  const gate =
    audience === "viewer"
      ? await requireViewer(sessionId)
      : await requireAnyRole(sessionId, ["moderator", "team"]);
  if (!gate.ok) {
    return errorResponse(gate.error, gate.message, gate.status);
  }

  const tokenRequest = await createSessionTokenRequest(sessionId, audience);
  return NextResponse.json({ ok: true, tokenRequest });
}

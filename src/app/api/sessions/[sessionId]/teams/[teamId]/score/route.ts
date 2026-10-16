import { NextResponse, type NextRequest } from "next/server";

import type { ApiErrorResponse, UpdateScoreRequest, UpdateScoreResponse } from "@/lib/ccl/api";
import { requireModerator } from "@/server/auth";
import { publish } from "@/server/events";
import { toTeamDto, updateTeamScore } from "@/server/team";

type RouteParams = { params: Promise<{ sessionId: string; teamId: string }> };

function errorResponse(error: string, message: string, status: number) {
  return NextResponse.json<ApiErrorResponse>(
    { ok: false, error, message },
    { status },
  );
}

/**
 * Tambah/kurang poin regu (moderator).
 *
 * `POST /api/sessions/[sessionId]/teams/[teamId]/score`
 * Body: `{ delta }` atau `{ outcome: "correct" | "wrong" }`
 *
 * Perubahan disiarkan lewat SSE (`score.updated`) supaya papan skor dan layar
 * penonton ikut bergerak seketika.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { sessionId, teamId } = await params;

  if (!sessionId || !teamId) {
    return errorResponse(
      "invalid_request",
      "sessionId dan teamId wajib diisi.",
      400,
    );
  }

  const gate = await requireModerator(sessionId);
  if (!gate.ok) {
    return errorResponse(gate.error, gate.message, gate.status);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_json", "Body permintaan harus JSON.", 400);
  }

  if (typeof body !== "object" || body === null) {
    return errorResponse("invalid_body", "Body permintaan tidak valid.", 400);
  }

  const { delta, outcome } = body as UpdateScoreRequest;

  if (
    delta !== undefined &&
    (typeof delta !== "number" || !Number.isFinite(delta))
  ) {
    return errorResponse("invalid_delta", "delta wajib berupa angka.", 400);
  }

  if (outcome !== undefined && outcome !== "correct" && outcome !== "wrong") {
    return errorResponse(
      "invalid_outcome",
      'outcome wajib "correct" atau "wrong".',
      400,
    );
  }

  if (delta === undefined && outcome === undefined) {
    return errorResponse(
      "missing_score",
      "Sertakan delta atau outcome.",
      400,
    );
  }

  const result = updateTeamScore({ sessionId, teamId, delta, outcome });

  if (result.status === "unknown_session") {
    return errorResponse(
      "unknown_session",
      `Sesi "${sessionId}" tidak ditemukan.`,
      404,
    );
  }

  if (result.status === "unknown_team") {
    return errorResponse(
      "unknown_team",
      `Regu "${teamId}" tidak ditemukan pada sesi ini.`,
      404,
    );
  }

  if (result.status === "invalid") {
    return errorResponse("invalid_score", "Permintaan skor tidak valid.", 400);
  }

  const team = toTeamDto(result.row);

  publish(sessionId, {
    type: "score.updated",
    at: new Date().toISOString(),
    team,
    delta: result.delta,
  });

  const response: UpdateScoreResponse = {
    ok: true,
    team,
    delta: result.delta,
  };
  return NextResponse.json(response);
}

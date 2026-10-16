import { NextResponse, type NextRequest } from "next/server";

import type { BuzzApiResponse, RecordBuzzRequest } from "@/lib/ccl/api";
import { recordBuzz, toBuzzEventDto } from "@/server/buzz";
import { publish } from "@/server/events";

/**
 * Endpoint catat tekanan tombol jawab.
 *
 * `POST /api/sessions/[sessionId]/buzz`
 * Body: `{ teamId, roundId?, reactionMs }`
 *
 * Menandai tekanan pertama sebagai regu tercepat dan mencegah tekanan dobel
 * dari regu yang sama. Berjalan di runtime Node (bawaan) karena memakai SQLite.
 */

type RouteParams = { params: Promise<{ sessionId: string }> };

function errorResponse(error: string, message: string, status: number) {
  return NextResponse.json<BuzzApiResponse>(
    { ok: false, error, message },
    { status },
  );
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;

  if (!sessionId) {
    return errorResponse("invalid_session", "Session id wajib diisi.", 400);
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

  const { teamId, roundId, reactionMs } = body as Partial<RecordBuzzRequest>;

  if (typeof teamId !== "string" || teamId.trim() === "") {
    return errorResponse("invalid_team", "teamId wajib berupa teks.", 400);
  }

  if (
    typeof reactionMs !== "number" ||
    !Number.isFinite(reactionMs) ||
    reactionMs < 0
  ) {
    return errorResponse(
      "invalid_reaction",
      "reactionMs wajib berupa angka >= 0.",
      400,
    );
  }

  if (roundId !== undefined && roundId !== null && typeof roundId !== "string") {
    return errorResponse("invalid_round", "roundId harus teks atau null.", 400);
  }

  const outcome = recordBuzz({
    sessionId,
    teamId: teamId.trim(),
    roundId: roundId ?? null,
    reactionMs,
  });

  if (outcome.status === "unknown_team") {
    return errorResponse(
      "unknown_team",
      `Regu "${outcome.teamId}" tidak ditemukan pada sesi ini.`,
      404,
    );
  }

  const event = toBuzzEventDto(outcome.row);

  const response: BuzzApiResponse = {
    ok: true,
    duplicate: outcome.duplicate,
    isFirst: outcome.row.isFirst,
    order: outcome.order,
    event,
  };

  // Siarkan ke moderator, regu lain, dan layar penonton. Tekanan ulang tidak
  // disiarkan ulang agar urutan tidak bergetar.
  if (!outcome.duplicate) {
    publish(sessionId, {
      type: "buzz.recorded",
      at: new Date().toISOString(),
      order: outcome.order,
      event,
    });
  }

  return NextResponse.json(response, {
    status: outcome.duplicate ? 200 : 201,
  });
}

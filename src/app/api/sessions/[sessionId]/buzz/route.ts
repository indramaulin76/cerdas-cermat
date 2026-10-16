import { NextResponse, type NextRequest } from "next/server";

import type {
  BuzzApiResponse,
  BuzzOrderResponse,
  RecordBuzzRequest,
} from "@/lib/ccl/api";
import { getBuzzOrder, recordBuzz, toBuzzEventDto, toHighlightDto } from "@/server/buzz";
import { publish } from "@/server/events";
import { requireModerator, requireTeam } from "@/server/auth";

/**
 * Endpoint tekanan tombol jawab.
 *
 * `POST /api/sessions/[sessionId]/buzz`
 * Body: `{ teamId, roundId?, reactionMs }`
 *
 * Menandai tekanan pertama sebagai regu tercepat dan mencegah tekanan dobel
 * dari regu yang sama. Berjalan di runtime Node (bawaan) karena memakai SQLite.
 *
 * `GET /api/sessions/[sessionId]/buzz?roundId=...`
 *
 * Mengembalikan urutan jawab regu tercepat (untuk moderator). Tanpa `roundId`,
 * memakai soal yang sedang terbuka.
 */

type RouteParams = { params: Promise<{ sessionId: string }> };

function errorResponse(error: string, message: string, status: number) {
  return NextResponse.json<BuzzApiResponse>(
    { ok: false, error, message },
    { status },
  );
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;

  if (!sessionId) {
    return errorResponse("invalid_session", "Session id wajib diisi.", 400);
  }
  const gate = await requireModerator(sessionId);
  if (!gate.ok) return errorResponse(gate.error, gate.message, gate.status);

  const roundId = request.nextUrl.searchParams.get("roundId");
  const order = getBuzzOrder({ sessionId, roundId });

  const response: BuzzOrderResponse = {
    ok: true,
    roundId: order.roundId,
    ranking: order.ranking.map(toBuzzEventDto),
    winner: order.winner ? toBuzzEventDto(order.winner) : null,
  };
  return NextResponse.json(response);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;

  if (!sessionId) {
    return errorResponse("invalid_session", "Session id wajib diisi.", 400);
  }
  const gate = await requireTeam(sessionId);
  if (!gate.ok) return errorResponse(gate.error, gate.message, gate.status);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_json", "Body permintaan harus JSON.", 400);
  }

  if (typeof body !== "object" || body === null) {
    return errorResponse("invalid_body", "Body permintaan tidak valid.", 400);
  }

  const { teamId, roundId } = body as Partial<RecordBuzzRequest>;

  if (typeof teamId !== "string" || teamId.trim() === "") {
    return errorResponse("invalid_team", "teamId wajib berupa teks.", 400);
  }

  if (typeof roundId !== "string" || roundId.trim() === "") {
    return errorResponse(
      "invalid_round",
      "roundId wajib menunjuk soal yang sedang terbuka.",
      400,
    );
  }

  const outcome = recordBuzz({
    sessionId,
    teamId: teamId.trim(),
    roundId,
  });

  if (outcome.status === "unknown_team") {
    return errorResponse(
      "unknown_team",
      `Regu "${outcome.teamId}" tidak ditemukan pada sesi ini.`,
      404,
    );
  }
  if (outcome.status === "round_not_open") {
    return errorResponse("round_not_open", "Tidak ada soal aktif untuk sesi ini.", 409);
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
    const ranking = outcome.ranking.map(toBuzzEventDto);
    publish(sessionId, {
      type: "buzz.recorded",
      at: new Date().toISOString(),
      order: outcome.order,
      event,
      ranking,
    });

    // Sorotan regu tercepat untuk layar penonton: regu paling atas urutan.
    publish(sessionId, {
      type: "highlight.updated",
      at: new Date().toISOString(),
      highlight: toHighlightDto(outcome.ranking[0] ?? null),
    });
  }

  return NextResponse.json(response, {
    status: outcome.duplicate ? 200 : 201,
  });
}

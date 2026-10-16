import { NextResponse, type NextRequest } from "next/server";

import type { ApiErrorResponse, ResetRoundResponse } from "@/lib/ccl/api";
import { requireModerator } from "@/server/auth";
import { toHighlightDto } from "@/server/buzz";
import { publish } from "@/server/events";
import { resetRound } from "@/server/round";

type RouteParams = { params: Promise<{ sessionId: string }> };

/**
 * Kosongkan/ulang ronde (moderator).
 *
 * `POST /api/sessions/[sessionId]/rounds/reset`
 *
 * Menutup soal yang sedang terbuka sehingga urutan jawab kembali bersih dan
 * tombol semua regu kembali ke keadaan siap menunggu.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
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

  const outcome = await resetRound(sessionId);

  await publish(sessionId, {
    type: "round.reset",
    at: new Date().toISOString(),
    roundId: outcome.closed?.id ?? null,
  });

  // Soal diulang: sorotan regu tercepat dibersihkan.
  await publish(sessionId, {
    type: "highlight.updated",
    at: new Date().toISOString(),
    highlight: toHighlightDto(null),
  });

  const response: ResetRoundResponse = {
    ok: true,
    closedRoundId: outcome.closed?.id ?? null,
  };
  return NextResponse.json(response);
}

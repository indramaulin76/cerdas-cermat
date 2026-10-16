import { NextResponse, type NextRequest } from "next/server";

import type { ApiErrorResponse } from "@/lib/ccl/api";
import { requireModerator } from "@/server/auth";

type RouteParams = { params: Promise<{ sessionId: string; teamId: string }> };

/**
 * Pertahankan respons yang jelas untuk klien lama tanpa mengizinkan perubahan
 * skor di luar giliran menjawab yang sedang berjalan.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { sessionId, teamId } = await params;
  const gate = await requireModerator(sessionId);
  if (!gate.ok) {
    return NextResponse.json<ApiErrorResponse>(
      { ok: false, error: gate.error, message: gate.message },
      { status: gate.status },
    );
  }
  return NextResponse.json<ApiErrorResponse>(
    {
      ok: false,
      error: "round_action_required",
      message: `Skor regu ${teamId} hanya dapat diubah melalui giliran menjawab pada soal aktif.`,
    },
    { status: 409 },
  );
}

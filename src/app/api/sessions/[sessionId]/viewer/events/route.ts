import { NextResponse, type NextRequest } from "next/server";

import type { ApiErrorResponse } from "@/lib/ccl/api";
import { requireViewer } from "@/server/auth";
import { createEventStream } from "@/server/stream";

type RouteParams = { params: Promise<{ sessionId: string }> };

function errorResponse(error: string, message: string, status: number) {
  return NextResponse.json<ApiErrorResponse>(
    { ok: false, error, message },
    { status },
  );
}

/**
 * Aliran peristiwa realtime khusus layar penonton lewat Server-Sent Events.
 *
 * `GET /api/sessions/[sessionId]/viewer/events`
 *
 * Layar penonton menyambung ke sini untuk menerima perubahan skor seketika
 * (`score.updated`), pembukaan soal, dan sorotan regu tercepat — tanpa perlu
 * memuat ulang. Berbeda dari kanal umum, akses di sini wajib lolos PIN layar
 * penonton bila sesi memilikinya.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;

  if (!sessionId) {
    return errorResponse("invalid_session", "Session id wajib diisi.", 400);
  }

  const gate = await requireViewer(sessionId);
  if (!gate.ok) {
    return errorResponse(gate.error, gate.message, gate.status);
  }

  return createEventStream(request, sessionId);
}

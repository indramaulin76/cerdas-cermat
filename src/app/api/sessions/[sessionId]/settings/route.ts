import { NextResponse, type NextRequest } from "next/server";

import type {
  ApiErrorResponse,
  UpdateSettingsRequest,
  UpdateSettingsResponse,
} from "@/lib/ccl/api";
import { requireModeratorOrAdmin } from "@/server/admin-auth";
import { publish } from "@/server/events";
import { toSessionDto, updateSessionSettings } from "@/server/session";

type RouteParams = { params: Promise<{ sessionId: string }> };

function errorResponse(error: string, message: string, status: number) {
  return NextResponse.json<ApiErrorResponse>(
    { ok: false, error, message },
    { status },
  );
}

/**
 * Ubah durasi menjawab pada sesi.
 *
 * `PATCH /api/sessions/[sessionId]/settings`
 * Body: `{ cooldownSeconds? }`
 *
 * Boleh diakses panitia yang sudah masuk atau moderator sesi. Perubahan
 * disiarkan lewat SSE (`session.updated`) supaya aba-aba regu dan papan skor
 * ikut menyesuaikan.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;

  if (!sessionId) {
    return errorResponse("invalid_session", "Session id wajib diisi.", 400);
  }

  const gate = await requireModeratorOrAdmin(sessionId);
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

  const { cooldownSeconds } = body as UpdateSettingsRequest;

  if (cooldownSeconds !== undefined && typeof cooldownSeconds !== "number") {
    return errorResponse("invalid_field", "cooldownSeconds wajib berupa angka.", 400);
  }

  const result = updateSessionSettings({ sessionId, cooldownSeconds });

  if (result.status === "unknown_session") {
    return errorResponse(
      "unknown_session",
      `Sesi "${sessionId}" tidak ditemukan.`,
      404,
    );
  }

  if (result.status === "invalid") {
    return errorResponse(
      "invalid_settings",
      "Pengaturan tidak valid atau kosong.",
      400,
    );
  }

  const session = toSessionDto(result.row);

  publish(sessionId, {
    type: "session.updated",
    at: new Date().toISOString(),
    session,
  });

  const response: UpdateSettingsResponse = { ok: true, session };
  return NextResponse.json(response);
}

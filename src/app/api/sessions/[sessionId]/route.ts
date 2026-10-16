import { NextResponse, type NextRequest } from "next/server";

import type {
  ApiErrorResponse,
  SessionDetailResponse,
} from "@/lib/ccl/api";
import { requireAdmin } from "@/server/admin-auth";
import { publish } from "@/server/events";
import {
  getSession,
  toSessionDetailDto,
  toSessionDto,
  updateSessionStatus,
} from "@/server/session";

type RouteParams = { params: Promise<{ sessionId: string }> };

function errorResponse(error: string, message: string, status: number) {
  return NextResponse.json<ApiErrorResponse>(
    { ok: false, error, message },
    { status },
  );
}

/**
 * Detail satu sesi untuk halaman admin.
 *
 * `GET /api/sessions/[sessionId]`
 *
 * Hanya panitia (admin) yang sudah masuk. Mengembalikan pengaturan lomba serta
 * link dan PIN tiap peran, sehingga admin bisa membuka ulang sesi kapan saja
 * dengan link & PIN yang sama.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;

  if (!sessionId) {
    return errorResponse("invalid_session", "Session id wajib diisi.", 400);
  }

  const gate = await requireAdmin();
  if (!gate.ok) {
    return errorResponse(gate.error, gate.message, gate.status);
  }

  const row = await getSession(sessionId);
  if (!row) {
    return errorResponse(
      "unknown_session",
      `Sesi "${sessionId}" tidak ditemukan.`,
      404,
    );
  }

  const response: SessionDetailResponse = {
    ok: true,
    session: toSessionDetailDto(row),
  };
  return NextResponse.json(response);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;
  if (!sessionId) {
    return errorResponse("invalid_session", "Session id wajib diisi.", 400);
  }

  const gate = await requireAdmin();
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
  const status = (body as { status?: unknown }).status;
  if (status !== "draft" && status !== "active" && status !== "finished") {
    return errorResponse("invalid_status", "Status sesi tidak valid.", 400);
  }

  const row = await updateSessionStatus(sessionId, status);
  if (!row) {
    return errorResponse(
      "unknown_session",
      `Sesi "${sessionId}" tidak ditemukan.`,
      404,
    );
  }
  await publish(sessionId, {
    type: "session.updated",
    at: new Date().toISOString(),
    session: toSessionDto(row),
  });
  const response: SessionDetailResponse = {
    ok: true,
    session: toSessionDetailDto(row),
  };
  return NextResponse.json(response);
}

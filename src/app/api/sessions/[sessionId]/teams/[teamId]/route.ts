import { NextResponse, type NextRequest } from "next/server";

import type {
  ApiErrorResponse,
  UpdateTeamRequest,
  UpdateTeamResponse,
} from "@/lib/ccl/api";
import { requireModerator } from "@/server/auth";
import { toTeamDto, updateTeam } from "@/server/team";

type RouteParams = { params: Promise<{ sessionId: string; teamId: string }> };

function errorResponse(error: string, message: string, status: number) {
  return NextResponse.json<ApiErrorResponse>(
    { ok: false, error, message },
    { status },
  );
}

/**
 * Ubah nama dan/atau warna regu (moderator/admin).
 *
 * `PATCH /api/sessions/[sessionId]/teams/[teamId]`
 * Body: `{ name?, color? }`
 *
 * Nama harus unik per sesi dan warna harus hex. Perubahan identitas tidak
 * mengubah skor regu.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

  const { name, color } = body as Partial<UpdateTeamRequest>;

  if (name !== undefined && typeof name !== "string") {
    return errorResponse("invalid_name", "Nama regu harus berupa teks.", 400);
  }

  if (color !== undefined && typeof color !== "string") {
    return errorResponse("invalid_color", "Warna harus berupa teks hex.", 400);
  }

  const outcome = updateTeam({ sessionId, teamId, name, color });

  if (outcome.status === "unknown_team") {
    return errorResponse(
      "unknown_team",
      `Regu "${teamId}" tidak ditemukan pada sesi ini.`,
      404,
    );
  }

  if (outcome.status === "invalid") {
    return errorResponse(
      "missing_fields",
      "Sertakan name dan/atau color.",
      400,
    );
  }

  if (outcome.status === "invalid_name") {
    const message =
      outcome.reason === "too_long"
        ? "Nama regu terlalu panjang (maksimal 60 karakter)."
        : "Nama regu wajib diisi.";
    return errorResponse("invalid_name", message, 400);
  }

  if (outcome.status === "duplicate_name") {
    return errorResponse(
      "duplicate_name",
      `Regu dengan nama "${outcome.name}" sudah ada.`,
      409,
    );
  }

  if (outcome.status === "invalid_color") {
    return errorResponse(
      "invalid_color",
      "Warna harus berupa hex, mis. #f43f5e.",
      400,
    );
  }

  const response: UpdateTeamResponse = {
    ok: true,
    team: toTeamDto(outcome.row),
  };
  return NextResponse.json(response);
}

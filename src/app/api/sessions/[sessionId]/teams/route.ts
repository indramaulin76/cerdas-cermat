import { NextResponse, type NextRequest } from "next/server";

import type {
  ApiErrorResponse,
  CreateTeamRequest,
  CreateTeamResponse,
  TeamsResponse,
} from "@/lib/ccl/api";
import { requireModerator } from "@/server/auth";
import { createTeam, listTeams, toTeamDto } from "@/server/team";

type RouteParams = { params: Promise<{ sessionId: string }> };

function errorResponse(error: string, message: string, status: number) {
  return NextResponse.json<ApiErrorResponse>(
    { ok: false, error, message },
    { status },
  );
}

/**
 * Daftar regu sebuah sesi beserta skor terkini.
 *
 * `GET /api/sessions/[sessionId]/teams`
 *
 * Dipakai moderator dan layar penonton untuk menampilkan papan skor.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;

  if (!sessionId) {
    return errorResponse("invalid_session", "Session id wajib diisi.", 400);
  }

  const response: TeamsResponse = {
    ok: true,
    teams: listTeams(sessionId).map(toTeamDto),
  };
  return NextResponse.json(response);
}

/**
 * Tambah regu baru ke sebuah sesi (moderator/admin).
 *
 * `POST /api/sessions/[sessionId]/teams`
 * Body: `{ name, color? }`
 *
 * Menegakkan batas 10 regu, nama wajib & unik per sesi, serta warna otomatis
 * bila tidak diberikan. Hasilnya langsung muncul di daftar regu.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;

  if (!sessionId) {
    return errorResponse("invalid_session", "Session id wajib diisi.", 400);
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

  const { name, color } = body as Partial<CreateTeamRequest>;

  if (typeof name !== "string") {
    return errorResponse("invalid_name", "Nama regu wajib diisi.", 400);
  }

  if (color !== undefined && typeof color !== "string") {
    return errorResponse("invalid_color", "Warna harus berupa teks hex.", 400);
  }

  const outcome = createTeam({ sessionId, name, color });

  if (outcome.status === "unknown_session") {
    return errorResponse(
      "unknown_session",
      `Sesi "${sessionId}" tidak ditemukan.`,
      404,
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

  if (outcome.status === "limit_reached") {
    return errorResponse(
      "limit_reached",
      `Maksimal ${outcome.max} regu per sesi.`,
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

  const response: CreateTeamResponse = {
    ok: true,
    team: toTeamDto(outcome.row),
  };
  return NextResponse.json(response, { status: 201 });
}

import { NextResponse, type NextRequest } from "next/server";

import type {
  ApiErrorResponse,
  CreateSessionRequest,
  CreateSessionResponse,
} from "@/lib/ccl/api";
import { requireAdmin } from "@/server/admin-auth";
import { createSession, toSessionDetailDto } from "@/server/session";

/** Panjang maksimum nama acara. */
const TITLE_MAX = 80;

function errorResponse(error: string, message: string, status: number) {
  return NextResponse.json<ApiErrorResponse>(
    { ok: false, error, message },
    { status },
  );
}

/**
 * Buat sesi lomba baru.
 *
 * `POST /api/sessions`
 * Body: `{ title }`
 *
 * Hanya panitia (admin) yang sudah masuk. Sesi dibuat berstatus `draft`
 * lengkap dengan tiga link peran dan PIN masing-masing, sehingga admin bisa
 * langsung membagikannya.
 */
export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
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

  const { title } = body as Partial<CreateSessionRequest>;

  if (typeof title !== "string" || title.trim() === "") {
    return errorResponse("invalid_title", "Nama acara wajib diisi.", 400);
  }

  const trimmed = title.trim();
  if (trimmed.length > TITLE_MAX) {
    return errorResponse(
      "invalid_title",
      `Nama acara maksimal ${TITLE_MAX} karakter.`,
      400,
    );
  }

  const session = toSessionDetailDto(createSession({ title: trimmed }));
  const response: CreateSessionResponse = { ok: true, session };
  return NextResponse.json(response, { status: 201 });
}

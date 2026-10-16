import { NextResponse, type NextRequest } from "next/server";

import type {
  AdminUsersResponse,
  ApiErrorResponse,
  SaveAdminUserRequest,
  SaveAdminUserResponse,
} from "@/lib/ccl/api";
import {
  deleteAdminUser,
  getCurrentAdmin,
  listAdminUsers,
  requireSystemAdmin,
  saveAdminUser,
} from "@/server/admin-auth";

function errorResponse(error: string, message: string, status: number) {
  return NextResponse.json<ApiErrorResponse>(
    { ok: false, error, message },
    { status },
  );
}

export async function GET() {
  const gate = await requireSystemAdmin();
  if (!gate.ok) return errorResponse(gate.error, gate.message, gate.status);
  const response: AdminUsersResponse = { ok: true, users: await listAdminUsers() };
  return NextResponse.json(response);
}

export async function POST(request: NextRequest) {
  const gate = await requireSystemAdmin();
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

  const input = body as Partial<SaveAdminUserRequest>;
  if (
    typeof input.name !== "string" ||
    typeof input.email !== "string" ||
    (input.password !== undefined && typeof input.password !== "string")
  ) {
    return errorResponse(
      "invalid_user",
      "Nama, email, dan kata sandi yang valid wajib diisi.",
      400,
    );
  }

  const result = await saveAdminUser({
    name: input.name,
    email: input.email,
    password: input.password,
  });
  if (result.status === "invalid") {
    return errorResponse(
      "invalid_user",
      "Nama dan email wajib valid; kata sandi minimal 8 karakter.",
      400,
    );
  }
  if (result.status === "duplicate_email") {
    return errorResponse("duplicate_email", "Email sudah digunakan.", 409);
  }
  if (result.status === "unknown_user") {
    return errorResponse("unknown_user", "Akun panitia tidak ditemukan.", 404);
  }
  const response: SaveAdminUserResponse = { ok: true, user: result.user };
  return NextResponse.json(response, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireSystemAdmin();
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

  const input = body as Partial<SaveAdminUserRequest>;
  if (
    typeof input.id !== "string" ||
    typeof input.name !== "string" ||
    typeof input.email !== "string" ||
    (input.password !== undefined && typeof input.password !== "string")
  ) {
    return errorResponse("invalid_user", "Data akun tidak valid.", 400);
  }

  const result = await saveAdminUser({
    id: input.id,
    name: input.name,
    email: input.email,
    password: input.password,
  });
  if (result.status === "unknown_user") {
    return errorResponse("unknown_user", "Akun panitia tidak ditemukan.", 404);
  }
  if (result.status === "invalid") {
    return errorResponse(
      "invalid_user",
      "Nama dan email wajib valid; kata sandi baru minimal 8 karakter.",
      400,
    );
  }
  if (result.status === "duplicate_email") {
    return errorResponse("duplicate_email", "Email sudah digunakan.", 409);
  }

  const response: SaveAdminUserResponse = { ok: true, user: result.user };
  return NextResponse.json(response);
}

export async function DELETE(request: NextRequest) {
  const gate = await requireSystemAdmin();
  if (!gate.ok) return errorResponse(gate.error, gate.message, gate.status);

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return errorResponse("invalid_user", "ID akun wajib diisi.", 400);
  const current = await getCurrentAdmin();
  if (current?.id === id) {
    return errorResponse(
      "cannot_delete_self",
      "Akun yang sedang digunakan tidak dapat dihapus.",
      409,
    );
  }
  const result = await deleteAdminUser(id);
  if (result === "unknown_user") {
    return errorResponse("unknown_user", "Akun panitia tidak ditemukan.", 404);
  }
  return NextResponse.json({ ok: true, deleted: id });
}

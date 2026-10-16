import type { NextRequest } from "next/server";

import { createEventStream } from "@/server/stream";

type RouteParams = { params: Promise<{ sessionId: string }> };

/**
 * Aliran peristiwa realtime sesi lewat Server-Sent Events (kanal umum).
 *
 * `GET /api/sessions/[sessionId]/events`
 *
 * Dashboard regu dan moderator menyambung ke sini untuk menerima pembukaan
 * soal, tekanan tombol, perubahan skor, dan pengaturan. Layar penonton memakai
 * kanal terpisah (`/viewer/events`) yang dilindungi PIN.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;

  return createEventStream(request, sessionId);
}

import type { NextRequest } from "next/server";

import type { SessionEvent } from "@/lib/ccl/api";
import { subscribe } from "@/server/events";
import { getSessionSnapshot } from "@/server/snapshot";

type RouteParams = { params: Promise<{ sessionId: string }> };

/** Jeda denyut koneksi (ms) supaya proxy tidak memutus aliran. */
const HEARTBEAT_MS = 20_000;

const encoder = new TextEncoder();

function encodeEvent(event: SessionEvent): Uint8Array {
  return encoder.encode(
    `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
  );
}

/**
 * Aliran peristiwa realtime sesi lewat Server-Sent Events.
 *
 * `GET /api/sessions/[sessionId]/events`
 *
 * Dashboard regu, moderator, dan layar penonton menyambung ke sini untuk
 * menerima pembukaan soal, tekanan tombol, perubahan skor, dan pengaturan.
 * Saat tersambung, klien langsung menerima `state.snapshot` berisi keadaan
 * terkini supaya yang bergabung di tengah lomba tidak tertinggal.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const send = (event: SessionEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encodeEvent(event));
        } catch {
          closed = true;
        }
      };

      // Berlangganan lebih dulu, lalu kirim cuplikan keadaan — semuanya dalam
      // satu tick sinkron, jadi tidak ada peristiwa yang terlewat di antaranya.
      const unsubscribe = subscribe(sessionId, send);

      const snapshot = getSessionSnapshot(sessionId);
      if (snapshot) send(snapshot);

      // Denyut awal agar klien tahu koneksi hidup.
      send({ type: "ping", at: new Date().toISOString() });

      const heartbeat = setInterval(() => {
        send({ type: "ping", at: new Date().toISOString() });
      }, HEARTBEAT_MS);

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Aliran mungkin sudah ditutup.
        }
      };

      request.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}

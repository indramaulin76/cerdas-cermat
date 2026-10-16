/**
 * Pembuat aliran Server-Sent Events (SSE) untuk sesi lomba.
 *
 * Dipakai kanal umum (`/events`, untuk moderator & regu) dan kanal layar
 * penonton (`/viewer/events`, di balik gerbang PIN). Logikanya sama: kirim
 * cuplikan keadaan saat tersambung, teruskan peristiwa sesi, dan jaga koneksi
 * dengan denyut berkala.
 */

import "server-only";

import type { NextRequest } from "next/server";

import type { SessionEvent } from "@/lib/ccl/api";
import { subscribe } from "@/server/events";
import { getSessionSnapshot } from "@/server/snapshot";

/** Jeda denyut koneksi (ms) supaya proxy tidak memutus aliran. */
const HEARTBEAT_MS = 20_000;

const encoder = new TextEncoder();

function encodeEvent(event: SessionEvent): Uint8Array {
  return encoder.encode(
    `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
  );
}

export type EventStreamOptions = {
  /**
   * Saring peristiwa yang tidak relevan untuk klien ini. Peristiwa yang
   * dikembalikan `false` tidak dikirim. Cuplikan keadaan awal tetap dikirim.
   */
  filter?: (event: SessionEvent) => boolean;
};

/**
 * Bangun `Response` berisi aliran peristiwa realtime sebuah sesi.
 *
 * Saat tersambung, klien langsung menerima `state.snapshot` berisi keadaan
 * terkini supaya yang bergabung di tengah lomba tidak tertinggal.
 */
export function createEventStream(
  request: NextRequest,
  sessionId: string,
  options: EventStreamOptions = {},
): Response {
  const { filter } = options;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const send = (event: SessionEvent) => {
        if (closed) return;
        if (filter && !filter(event)) return;
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

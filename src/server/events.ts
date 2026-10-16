/**
 * Bus peristiwa realtime dalam proses untuk Cerdas Cermat Live.
 *
 * Endpoint SSE berlangganan ke bus ini, dan endpoint aksi (buka soal, catat
 * tekanan) memublikasikan peristiwa ke sini. Bus disimpan di `globalThis`
 * supaya tetap hidup saat modul dimuat ulang (hot reload) di mode dev.
 *
 * Catatan: bus ini berlaku untuk satu proses Node. Untuk lomba di satu server
 * (skenario PRD) ini cukup; bila nanti dijalankan multi-instance, ganti bus ini
 * dengan pub/sub bersama (mis. Redis).
 */

import "server-only";

import type { SessionEvent } from "@/lib/ccl/api";

type Listener = (event: SessionEvent) => void;

type Bus = Map<string, Set<Listener>>;

const globalForBus = globalThis as unknown as { __cclEventBus?: Bus };

const bus: Bus = globalForBus.__cclEventBus ?? new Map<string, Set<Listener>>();
globalForBus.__cclEventBus = bus;

/** Berlangganan peristiwa satu sesi. Kembalikan fungsi untuk berhenti. */
export function subscribe(sessionId: string, listener: Listener): () => void {
  let listeners = bus.get(sessionId);
  if (!listeners) {
    listeners = new Set<Listener>();
    bus.set(sessionId, listeners);
  }
  listeners.add(listener);

  return () => {
    const current = bus.get(sessionId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) bus.delete(sessionId);
  };
}

/** Kirim peristiwa ke semua pelanggan sesi tersebut. */
export function publish(sessionId: string, event: SessionEvent): void {
  const listeners = bus.get(sessionId);
  if (!listeners) return;

  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Pelanggan yang bermasalah tidak boleh menghentikan yang lain.
    }
  }
}

/** Jumlah pelanggan aktif (dipakai untuk observasi/debug). */
export function subscriberCount(sessionId: string): number {
  return bus.get(sessionId)?.size ?? 0;
}

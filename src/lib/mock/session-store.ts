/**
 * Penyimpanan sesi tiruan di sisi klien (localStorage).
 *
 * Sesi yang dibuat admin lewat form pada fase frontend belum tersimpan di
 * server. Supaya sesi baru tetap bisa dibuka di halaman detail (walau halaman
 * dimuat ulang), sesi buatan admin disimpan di localStorage dan digabung dengan
 * daftar sesi bawaan. Layer backend nanti menggantikan ini dengan basis data.
 *
 * Store ini dibaca lewat `useSyncExternalStore` supaya aman dari perbedaan
 * render server/klien (snapshot server selalu kosong).
 */

import type { SessionSummary, SessionStatus } from "@/lib/ccl/types";
import { MOCK_SESSIONS } from "@/lib/mock/sessions";

const STORAGE_KEY = "ccl:mock:sessions";

/** Referensi stabil untuk snapshot kosong (server & localStorage kosong). */
const EMPTY: SessionSummary[] = [];

const VALID_STATUS: SessionStatus[] = ["draft", "active", "finished"];

let cache: SessionSummary[] | null = null;
const listeners = new Set<() => void>();

function isSessionSummary(value: unknown): value is SessionSummary {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.teamCount === "number" &&
    typeof candidate.status === "string" &&
    VALID_STATUS.includes(candidate.status as SessionStatus)
  );
}

function readStorage(): SessionSummary[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const valid = parsed.filter(isSessionSummary);
    return valid.length > 0 ? valid : EMPTY;
  } catch {
    return EMPTY;
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

/** Berlangganan perubahan daftar sesi buatan admin. */
export function subscribeCreatedSessions(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Snapshot sesi buatan admin (dibaca sekali dari localStorage lalu di-cache). */
export function getCreatedSessions(): SessionSummary[] {
  if (cache === null) cache = readStorage();
  return cache;
}

/** Snapshot sisi server: selalu kosong (localStorage tidak ada di server). */
export function getServerCreatedSessions(): SessionSummary[] {
  return EMPTY;
}

/** Simpan satu sesi buatan admin baru dan beri tahu pelanggan. */
export function addCreatedSession(session: SessionSummary): void {
  const next = [session, ...getCreatedSessions()];
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage bisa penuh/diblokir; abaikan agar UI tetap jalan.
    }
  }
  emit();
}

/** Cari sesi buatan admin berdasarkan id (referensi stabil). */
export function getCreatedSession(sessionId: string): SessionSummary | null {
  return getCreatedSessions().find((session) => session.id === sessionId) ?? null;
}

/** Gabungkan sesi bawaan dengan sesi buatan admin (yang buatan menang). */
export function mergeSessions(created: SessionSummary[]): SessionSummary[] {
  const byId = new Map<string, SessionSummary>();
  for (const session of MOCK_SESSIONS) byId.set(session.id, session);
  for (const session of created) byId.set(session.id, session);
  return [...byId.values()];
}

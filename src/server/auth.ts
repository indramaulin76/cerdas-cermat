/**
 * Autentikasi PIN moderator per sesi.
 *
 * Moderator membuka dashboard dengan PIN yang diberikan admin. Setelah cocok,
 * server menanam cookie bertanda tangan (HMAC) sehingga permintaan berikutnya
 * bisa diverifikasi tanpa menyimpan sesi di server.
 *
 * Bila sebuah sesi belum punya PIN moderator, akses dibuka (mode dev) supaya
 * alur data tiruan tetap jalan. Begitu PIN dipasang, proteksi langsung aktif.
 */

import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { db } from "@/db";
import { sessions } from "@/db/schema";

/**
 * Rahasia penandatangan cookie. Setel `CCL_AUTH_SECRET` di produksi; nilai
 * bawaan hanya untuk pengembangan lokal.
 */
const AUTH_SECRET = process.env.CCL_AUTH_SECRET ?? "ccl-dev-insecure-secret";

/** Umur cookie moderator: 12 jam (cukup untuk satu acara). */
export const MODERATOR_COOKIE_MAX_AGE = 60 * 60 * 12;

/** Nama cookie moderator untuk sebuah sesi. */
export function moderatorCookieName(sessionId: string): string {
  return `ccl_moderator_${sessionId}`;
}

function sign(value: string): string {
  return createHmac("sha256", AUTH_SECRET).update(value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/** Buat token bertanda tangan untuk moderator sebuah sesi. */
export function createModeratorToken(sessionId: string): string {
  return sign(`moderator:${sessionId}`);
}

/** Verifikasi token moderator sebuah sesi. */
export function verifyModeratorToken(
  sessionId: string,
  token: string,
): boolean {
  return safeEqual(token, createModeratorToken(sessionId));
}

/** Hasil pemeriksaan PIN terhadap basis data. */
export type PinCheck = "ok" | "wrong" | "no_pin" | "no_session";

/** Cocokkan PIN moderator dengan yang tersimpan pada sesi. */
export function verifyModeratorPin(
  sessionId: string,
  pin: string,
): PinCheck {
  const row = db
    .select({ pin: sessions.moderatorPin })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get();

  if (!row) return "no_session";
  if (!row.pin) return "no_pin";
  return safeEqual(pin, row.pin) ? "ok" : "wrong";
}

/** Apakah permintaan saat ini sudah terautentikasi sebagai moderator. */
export async function isModeratorAuthenticated(
  sessionId: string,
): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(moderatorCookieName(sessionId))?.value;
  return Boolean(token && verifyModeratorToken(sessionId, token));
}

/** Hasil pemeriksaan izin moderator. */
export type ModeratorGate =
  | { ok: true }
  | { ok: false; status: number; error: string; message: string };

/**
 * Gerbang untuk aksi khusus moderator.
 *
 * Sesi tanpa PIN → dibuka. Sesi ber-PIN → wajib cookie moderator yang sah.
 */
export async function requireModerator(
  sessionId: string,
): Promise<ModeratorGate> {
  const row = db
    .select({ pin: sessions.moderatorPin })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get();

  if (!row) {
    return {
      ok: false,
      status: 404,
      error: "unknown_session",
      message: `Sesi "${sessionId}" tidak ditemukan.`,
    };
  }

  // Belum ada PIN → mode terbuka (memudahkan pengembangan & demo).
  if (!row.pin) return { ok: true };

  if (await isModeratorAuthenticated(sessionId)) return { ok: true };

  return {
    ok: false,
    status: 401,
    error: "unauthorized",
    message: "PIN moderator diperlukan untuk aksi ini.",
  };
}

/* ------------------------------ Layar Penonton ------------------------------ */

/** Umur cookie penonton: 12 jam (cukup untuk satu acara). */
export const VIEWER_COOKIE_MAX_AGE = 60 * 60 * 12;

/** Nama cookie penonton untuk sebuah sesi. */
export function viewerCookieName(sessionId: string): string {
  return `ccl_viewer_${sessionId}`;
}

/** Buat token bertanda tangan untuk penonton sebuah sesi. */
export function createViewerToken(sessionId: string): string {
  return sign(`viewer:${sessionId}`);
}

/** Verifikasi token penonton sebuah sesi. */
export function verifyViewerToken(sessionId: string, token: string): boolean {
  return safeEqual(token, createViewerToken(sessionId));
}

/** Cocokkan PIN layar penonton dengan yang tersimpan pada sesi. */
export function verifyViewerPin(sessionId: string, pin: string): PinCheck {
  const row = db
    .select({ pin: sessions.viewerPin })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get();

  if (!row) return "no_session";
  if (!row.pin) return "no_pin";
  return safeEqual(pin, row.pin) ? "ok" : "wrong";
}

/** Apakah permintaan saat ini sudah terautentikasi sebagai penonton. */
export async function isViewerAuthenticated(
  sessionId: string,
): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(viewerCookieName(sessionId))?.value;
  return Boolean(token && verifyViewerToken(sessionId, token));
}

/**
 * Gerbang untuk aksi/data khusus layar penonton.
 *
 * Sesi tanpa PIN → dibuka (mode dev). Sesi ber-PIN → wajib cookie penonton.
 */
export async function requireViewer(sessionId: string): Promise<ModeratorGate> {
  const row = db
    .select({ pin: sessions.viewerPin })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get();

  if (!row) {
    return {
      ok: false,
      status: 404,
      error: "unknown_session",
      message: `Sesi "${sessionId}" tidak ditemukan.`,
    };
  }

  if (!row.pin) return { ok: true };

  if (await isViewerAuthenticated(sessionId)) return { ok: true };

  return {
    ok: false,
    status: 401,
    error: "unauthorized",
    message: "PIN layar penonton diperlukan untuk aksi ini.",
  };
}

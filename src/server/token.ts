/**
 * Alat token bersama untuk autentikasi berbasis cookie.
 *
 * Cookie peran (moderator, penonton, panitia/admin) memakai tanda tangan HMAC
 * yang sama supaya verifikasi konsisten dan tanpa menyimpan sesi di server.
 */

import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

function getAuthSecret(): string {
  const secret = process.env.CCL_AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("CCL_AUTH_SECRET wajib diatur di lingkungan produksi.");
  }
  return secret ?? "ccl-dev-insecure-secret";
}

/** Tanda tangani sebuah nilai dengan HMAC-SHA256. */
export function signValue(value: string): string {
  return createHmac("sha256", getAuthSecret()).update(value).digest("hex");
}

/** Bandingkan dua tanda tangan dengan waktu tetap. */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Bandingkan dua nilai rahasia (mis. kata sandi) tanpa membocorkan panjang atau
 * isinya. Kedua nilai ditandatangani dulu agar perbandingan berukuran sama.
 */
export function safeEqualSecret(a: string, b: string): boolean {
  return safeEqual(signValue(a), signValue(b));
}

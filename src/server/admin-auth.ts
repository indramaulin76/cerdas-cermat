/**
 * Autentikasi panitia (admin) untuk mengelola sesi lomba.
 *
 * Admin masuk dengan satu kata sandi bersama (dari `CCL_ADMIN_PASSWORD`),
 * kemudian server menanam cookie bertanda tangan (HMAC) sehingga permintaan
 * berikutnya bisa diverifikasi tanpa menyimpan sesi di server.
 *
 * Ini fondasi untuk fitur "Sesi & Link": endpoint yang mengelola sesi
 * (buat/daftar/detail) dijaga `requireAdmin()`. Fitur "Login Admin" nanti akan
 * mengganti kata sandi bersama dengan akun panitia per orang.
 */

import "server-only";

import { cookies } from "next/headers";

import { requireModerator, type ModeratorGate } from "@/server/auth";
import { safeEqual, safeEqualSecret, signValue } from "@/server/token";

/**
 * Kata sandi panitia bersama. Setel `CCL_ADMIN_PASSWORD` di produksi; nilai
 * bawaan hanya untuk pengembangan lokal.
 */
const ADMIN_PASSWORD = process.env.CCL_ADMIN_PASSWORD ?? "panitia";

/** Nama cookie sesi panitia. */
export const ADMIN_COOKIE_NAME = "ccl_admin";

/** Umur cookie panitia: 8 jam (satu hari kerja acara). */
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 8;

/** Opsi cookie sesi panitia. */
export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  };
}

/** Buat token sesi panitia. */
export function createAdminToken(): string {
  return signValue("admin");
}

/** Verifikasi token sesi panitia. */
export function verifyAdminToken(token: string): boolean {
  return safeEqual(token, createAdminToken());
}

/** Cocokkan kata sandi panitia dengan yang dikonfigurasi. */
export function verifyAdminPassword(password: string): boolean {
  return safeEqualSecret(password, ADMIN_PASSWORD);
}

/** Apakah permintaan saat ini sudah masuk sebagai panitia. */
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return Boolean(token && verifyAdminToken(token));
}

/** Hasil pemeriksaan izin panitia. */
export type AdminGate =
  | { ok: true }
  | { ok: false; status: number; error: string; message: string };

/** Gerbang untuk aksi khusus panitia. */
export async function requireAdmin(): Promise<AdminGate> {
  if (await isAdminAuthenticated()) return { ok: true };

  return {
    ok: false,
    status: 401,
    error: "unauthorized",
    message: "Masuk sebagai panitia dulu untuk mengelola sesi.",
  };
}

/**
 * Gerbang untuk endpoint sesi yang boleh diakses panitia **atau** moderator
 * sesi tersebut. Panitia yang sudah masuk lolos tanpa PIN; sesi tanpa PIN
 * moderator juga tetap terbuka (mode dev).
 */
export async function requireModeratorOrAdmin(
  sessionId: string,
): Promise<ModeratorGate> {
  if (await isAdminAuthenticated()) return { ok: true };
  return requireModerator(sessionId);
}

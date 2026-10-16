/**
 * Autentikasi PIN per peran sesi (moderator, layar penonton, HP regu).
 *
 * Setiap peran masuk dengan PIN-nya sendiri yang diberikan admin. Setelah cocok,
 * server menanam cookie bertanda tangan (HMAC) sehingga permintaan berikutnya
 * bisa diverifikasi tanpa menyimpan sesi di server.
 *
 * Sesi tanpa PIN ditolak, bukan dibuka, agar konfigurasi yang belum lengkap
 * tidak berubah menjadi akses tanpa autentikasi.
 *
 * Intinya bersifat generik (`requireRole`/`verifyRolePin`); pembungkus khusus
 * moderator/penonton/regu disediakan agar pemanggil lama tetap bekerja.
 */

import "server-only";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { db } from "@/db";
import { sessions } from "@/db/schema";
import { ROLE_ORDER, type RoleId } from "@/lib/ccl/roles";
import { safeEqual, signValue } from "@/server/token";

/** Umur cookie peran: 12 jam (cukup untuk satu acara). */
export const ROLE_COOKIE_MAX_AGE = 60 * 60 * 12;

/** Label peran dalam pesan galat (mis. "PIN moderator"). */
export const ROLE_PIN_LABEL: Record<RoleId, string> = {
  moderator: "moderator",
  viewer: "layar penonton",
  team: "regu",
};

/** Hasil pemeriksaan PIN terhadap basis data. */
export type PinCheck = "ok" | "wrong" | "no_pin" | "no_session";

/** Hasil pemeriksaan izin sebuah peran. */
export type RoleGate =
  | { ok: true }
  | { ok: false; status: number; error: string; message: string };

/** Apakah sebuah nilai adalah peran yang dikenal. */
export function isRoleId(value: string): value is RoleId {
  return (ROLE_ORDER as string[]).includes(value);
}

/** Kolom PIN yang menyimpan PIN sebuah peran. */
function rolePinColumn(role: RoleId) {
  return role === "moderator"
    ? sessions.moderatorPin
    : role === "viewer"
      ? sessions.viewerPin
      : sessions.teamPin;
}

/* ------------------------------ Inti generik per peran ------------------------------ */

/** Nama cookie sebuah peran untuk sebuah sesi. */
export function roleCookieName(sessionId: string, role: RoleId): string {
  return `ccl_${role}_${sessionId}`;
}

/** Buat token bertanda tangan untuk sebuah peran pada sebuah sesi. */
export function createRoleToken(sessionId: string, role: RoleId): string {
  return signValue(`${role}:${sessionId}`);
}

/** Verifikasi token sebuah peran pada sebuah sesi. */
export function verifyRoleToken(
  sessionId: string,
  role: RoleId,
  token: string,
): boolean {
  return safeEqual(token, createRoleToken(sessionId, role));
}

/** Cocokkan PIN sebuah peran dengan yang tersimpan pada sesi. */
export async function verifyRolePin(
  sessionId: string,
  role: RoleId,
  pin: string,
): Promise<PinCheck> {
  const [row] = await db
    .select({ pin: rolePinColumn(role) })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!row) return "no_session";
  if (!row.pin) return "no_pin";
  return safeEqual(pin, row.pin) ? "ok" : "wrong";
}

/** Apakah permintaan saat ini sudah terautentikasi sebagai sebuah peran. */
export async function isRoleAuthenticated(
  sessionId: string,
  role: RoleId,
): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(roleCookieName(sessionId, role))?.value;
  return Boolean(token && verifyRoleToken(sessionId, role, token));
}

/**
 * Gerbang untuk aksi/data khusus sebuah peran.
 *
 * Sesi tanpa PIN peran → ditolak. Sesi ber-PIN → wajib cookie peran yang sah.
 */
export async function requireRole(
  sessionId: string,
  role: RoleId,
): Promise<RoleGate> {
  const [row] = await db
    .select({ pin: rolePinColumn(role) })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!row) {
    return {
      ok: false,
      status: 404,
      error: "unknown_session",
      message: `Sesi "${sessionId}" tidak ditemukan.`,
    };
  }
  if (!row.pin) {
    return {
      ok: false,
      status: 409,
      error: "pin_not_set",
      message: `PIN ${ROLE_PIN_LABEL[role]} belum diatur untuk sesi ini.`,
    };
  }

  if (await isRoleAuthenticated(sessionId, role)) return { ok: true };

  return {
    ok: false,
    status: 401,
    error: "unauthorized",
    message: `PIN ${ROLE_PIN_LABEL[role]} diperlukan untuk aksi ini.`,
  };
}

/** Akses untuk salah satu dashboard peran yang memakai data sesi bersama. */
export async function requireAnyRole(
  sessionId: string,
  roles: RoleId[],
): Promise<RoleGate> {
  const [row] = await db
    .select({
      moderatorPin: sessions.moderatorPin,
      viewerPin: sessions.viewerPin,
      teamPin: sessions.teamPin,
    })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);
  if (!row) {
    return {
      ok: false,
      status: 404,
      error: "unknown_session",
      message: `Sesi "${sessionId}" tidak ditemukan.`,
    };
  }

  let configured = false;
  for (const role of roles) {
    const hasPin =
      role === "moderator"
        ? row.moderatorPin
        : role === "viewer"
          ? row.viewerPin
          : row.teamPin;
    if (!hasPin) continue;
    configured = true;
    if (await isRoleAuthenticated(sessionId, role)) return { ok: true };
  }
  return {
    ok: false,
    status: configured ? 401 : 409,
    error: configured ? "unauthorized" : "pin_not_set",
    message: configured
      ? "Masuk dengan PIN peran yang sesuai untuk mengakses data sesi."
      : "PIN peran belum diatur untuk sesi ini.",
  };
}

/* ------------------------------ Pembungkus moderator ------------------------------ */

/** Umur cookie moderator. */
export const MODERATOR_COOKIE_MAX_AGE = ROLE_COOKIE_MAX_AGE;

/** Nama cookie moderator untuk sebuah sesi. */
export function moderatorCookieName(sessionId: string): string {
  return roleCookieName(sessionId, "moderator");
}

/** Buat token bertanda tangan untuk moderator sebuah sesi. */
export function createModeratorToken(sessionId: string): string {
  return createRoleToken(sessionId, "moderator");
}

/** Verifikasi token moderator sebuah sesi. */
export function verifyModeratorToken(
  sessionId: string,
  token: string,
): boolean {
  return verifyRoleToken(sessionId, "moderator", token);
}

/** Cocokkan PIN moderator dengan yang tersimpan pada sesi. */
export async function verifyModeratorPin(
  sessionId: string,
  pin: string,
): Promise<PinCheck> {
  return await verifyRolePin(sessionId, "moderator", pin);
}

/** Apakah permintaan saat ini sudah terautentikasi sebagai moderator. */
export async function isModeratorAuthenticated(
  sessionId: string,
): Promise<boolean> {
  return isRoleAuthenticated(sessionId, "moderator");
}

/** Gerbang untuk aksi khusus moderator. */
export type ModeratorGate = RoleGate;

/** Gerbang untuk aksi khusus moderator. */
export async function requireModerator(
  sessionId: string,
): Promise<RoleGate> {
  return requireRole(sessionId, "moderator");
}

/* ------------------------------ Pembungkus layar penonton ------------------------------ */

/** Umur cookie penonton. */
export const VIEWER_COOKIE_MAX_AGE = ROLE_COOKIE_MAX_AGE;

/** Nama cookie penonton untuk sebuah sesi. */
export function viewerCookieName(sessionId: string): string {
  return roleCookieName(sessionId, "viewer");
}

/** Buat token bertanda tangan untuk penonton sebuah sesi. */
export function createViewerToken(sessionId: string): string {
  return createRoleToken(sessionId, "viewer");
}

/** Verifikasi token penonton sebuah sesi. */
export function verifyViewerToken(sessionId: string, token: string): boolean {
  return verifyRoleToken(sessionId, "viewer", token);
}

/** Cocokkan PIN layar penonton dengan yang tersimpan pada sesi. */
export async function verifyViewerPin(sessionId: string, pin: string): Promise<PinCheck> {
  return await verifyRolePin(sessionId, "viewer", pin);
}

/** Apakah permintaan saat ini sudah terautentikasi sebagai penonton. */
export async function isViewerAuthenticated(
  sessionId: string,
): Promise<boolean> {
  return isRoleAuthenticated(sessionId, "viewer");
}

/** Gerbang untuk aksi/data khusus layar penonton. */
export async function requireViewer(sessionId: string): Promise<RoleGate> {
  return requireRole(sessionId, "viewer");
}

/* ------------------------------ Pembungkus HP regu ------------------------------ */

/** Umur cookie HP regu. */
export const TEAM_COOKIE_MAX_AGE = ROLE_COOKIE_MAX_AGE;

/** Nama cookie HP regu untuk sebuah sesi. */
export function teamCookieName(sessionId: string): string {
  return roleCookieName(sessionId, "team");
}

/** Buat token bertanda tangan untuk HP regu sebuah sesi. */
export function createTeamToken(sessionId: string): string {
  return createRoleToken(sessionId, "team");
}

/** Verifikasi token HP regu sebuah sesi. */
export function verifyTeamToken(sessionId: string, token: string): boolean {
  return verifyRoleToken(sessionId, "team", token);
}

/** Cocokkan PIN regu dengan yang tersimpan pada sesi. */
export async function verifyTeamPin(sessionId: string, pin: string): Promise<PinCheck> {
  return await verifyRolePin(sessionId, "team", pin);
}

/** Apakah permintaan saat ini sudah terautentikasi sebagai HP regu. */
export async function isTeamAuthenticated(
  sessionId: string,
): Promise<boolean> {
  return isRoleAuthenticated(sessionId, "team");
}

/** Gerbang untuk aksi/data khusus HP regu. */
export async function requireTeam(sessionId: string): Promise<RoleGate> {
  return requireRole(sessionId, "team");
}

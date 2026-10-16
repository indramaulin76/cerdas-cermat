/**
 * Autentikasi akun panitia untuk mengelola sesi lomba.
 *
 * `CCL_ADMIN_EMAIL` dan `CCL_ADMIN_PASSWORD` menyediakan akun bootstrap;
 * akun tambahan disimpan dalam SQLite dengan hash scrypt.
 */

import "server-only";

import { randomBytes, randomUUID, scryptSync } from "node:crypto";

import { asc, eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { db } from "@/db";
import { users, type UserRow } from "@/db/schema";
import { safeEqual, safeEqualSecret, signValue } from "@/server/token";
import {
  requireAnyRole,
  requireModerator,
  type ModeratorGate,
  type RoleGate,
} from "@/server/auth";
import type { RoleId } from "@/lib/ccl/roles";

const BOOTSTRAP_ID = "bootstrap-admin";

function getBootstrapCredentials() {
  const configuredEmail = process.env.CCL_ADMIN_EMAIL;
  const configuredPassword = process.env.CCL_ADMIN_PASSWORD;
  if (
    process.env.NODE_ENV === "production" &&
    (!configuredEmail?.trim() || !configuredPassword)
  ) {
    throw new Error(
      "CCL_ADMIN_EMAIL dan CCL_ADMIN_PASSWORD wajib diatur di lingkungan produksi.",
    );
  }
  return {
    email: (configuredEmail ?? "admin@ccl.local").trim().toLowerCase(),
    password: configuredPassword ?? "panitia",
  };
}

export const ADMIN_COOKIE_NAME = "ccl_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 8;

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  };
}

export type AdminIdentity = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "panitia";
};

export type AdminUserDto = AdminIdentity & { createdAt: string };

function toIdentity(row: UserRow): AdminIdentity {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

function tokenSignature(id: string): string {
  return signValue(`admin:${id}`);
}

export function createAdminToken(id = BOOTSTRAP_ID): string {
  return `${id}.${tokenSignature(id)}`;
}

export function verifyAdminToken(token: string): string | null {
  const separator = token.lastIndexOf(".");
  if (separator < 1) return null;
  const id = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  return safeEqual(signature, tokenSignature(id)) ? id : null;
}

function parsePasswordHash(encoded: string): { salt: Buffer; hash: Buffer } | null {
  const [algorithm, saltHex, hashHex] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltHex || !hashHex) return null;
  if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(hashHex)) {
    return null;
  }
  return { salt: Buffer.from(saltHex, "hex"), hash: Buffer.from(hashHex, "hex") };
}

export function hashAdminPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function verifyPasswordHash(password: string, encoded: string): boolean {
  const parsed = parsePasswordHash(encoded);
  if (!parsed) return false;
  const candidate = scryptSync(password, parsed.salt, parsed.hash.length);
  return safeEqual(candidate.toString("hex"), parsed.hash.toString("hex"));
}

export function verifyAdminPassword(password: string): boolean {
  return safeEqualSecret(password, getBootstrapCredentials().password);
}

export function verifyAdminCredentials(
  email: string,
  password: string,
): AdminIdentity | null {
  const normalizedEmail = email.trim().toLowerCase();
  const row = db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .get();

  if (row) {
    return verifyPasswordHash(password, row.passwordHash) ? toIdentity(row) : null;
  }

  if (
    normalizedEmail === getBootstrapCredentials().email &&
    verifyAdminPassword(password)
  ) {
    return {
      id: BOOTSTRAP_ID,
      name: "Admin",
      email: getBootstrapCredentials().email,
      role: "admin",
    };
  }
  return null;
}

export async function getCurrentAdmin(): Promise<AdminIdentity | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  const id = verifyAdminToken(token);
  if (!id) return null;
  if (id === BOOTSTRAP_ID) {
    const { email } = getBootstrapCredentials();
    return {
      id: BOOTSTRAP_ID,
      name: "Admin",
      email,
      role: "admin",
    };
  }
  const row = db.select().from(users).where(eq(users.id, id)).get();
  return row ? toIdentity(row) : null;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  return (await getCurrentAdmin()) !== null;
}

export type AdminGate =
  | { ok: true }
  | { ok: false; status: number; error: string; message: string };

export async function requireAdmin(): Promise<AdminGate> {
  if (await isAdminAuthenticated()) return { ok: true };
  return {
    ok: false,
    status: 401,
    error: "unauthorized",
    message: "Masuk sebagai panitia dulu untuk mengelola sesi.",
  };
}

export async function requireSystemAdmin(): Promise<AdminGate> {
  const admin = await getCurrentAdmin();
  if (admin?.role === "admin") return { ok: true };
  return {
    ok: false,
    status: admin ? 403 : 401,
    error: admin ? "forbidden" : "unauthorized",
    message: admin
      ? "Hanya admin yang dapat mengelola akun panitia."
      : "Masuk sebagai admin untuk mengelola akun panitia.",
  };
}

/** Akun panitia yang bisa ditampilkan (tanpa hash kata sandi). */
export function listAdminUsers(): AdminUserDto[] {
  return db
    .select()
    .from(users)
    .orderBy(asc(users.createdAt), asc(users.email))
    .all()
    .map((row) => ({
      ...toIdentity(row),
      createdAt: row.createdAt.toISOString(),
    }));
}

export type SaveAdminUserInput = {
  id?: string;
  name: string;
  email: string;
  password?: string;
};

export type SaveAdminUserOutcome =
  | { status: "saved"; user: AdminUserDto }
  | { status: "invalid" }
  | { status: "duplicate_email" }
  | { status: "unknown_user" };

export function saveAdminUser(
  input: SaveAdminUserInput,
): SaveAdminUserOutcome {
  const name = input.name.trim().replace(/\s+/g, " ");
  const email = input.email.trim().toLowerCase();
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!name || name.length > 80 || !validEmail) return { status: "invalid" };
  if (
    input.password !== undefined &&
    (input.password.length < 8 || input.password.length > 128)
  ) {
    return { status: "invalid" };
  }
  if (!input.id && !input.password) return { status: "invalid" };

  const existing = db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();
  if (existing && existing.id !== input.id) return { status: "duplicate_email" };

  const now = new Date();
  if (input.id) {
    const current = db.select().from(users).where(eq(users.id, input.id)).get();
    if (!current) return { status: "unknown_user" };
    const patch = {
      name,
      email,
      ...(input.password ? { passwordHash: hashAdminPassword(input.password) } : {}),
    };
    db.update(users).set(patch).where(eq(users.id, input.id)).run();
    return {
      status: "saved",
      user: {
        id: current.id,
        name,
        email,
        role: current.role,
        createdAt: current.createdAt.toISOString(),
      },
    };
  }

  const row = {
    id: randomUUID(),
    name,
    email,
    passwordHash: hashAdminPassword(input.password!),
    role: "panitia" as const,
    createdAt: now,
  };
  db.insert(users).values(row).run();
  return {
    status: "saved",
    user: {
      id: row.id,
      name,
      email,
      role: row.role,
      createdAt: now.toISOString(),
    },
  };
}

export type DeleteAdminUserOutcome = "deleted" | "unknown_user";

export function deleteAdminUser(id: string): DeleteAdminUserOutcome {
  const result = db.delete(users).where(eq(users.id, id)).run();
  return result.changes > 0 ? "deleted" : "unknown_user";
}

/**
 * Endpoint sesi boleh diakses panitia atau moderator sesi ber-PIN.
 */
export async function requireModeratorOrAdmin(
  sessionId: string,
): Promise<ModeratorGate> {
  if (await isAdminAuthenticated()) return { ok: true };
  return requireModerator(sessionId);
}

/** Baca data sesi untuk admin atau salah satu peran yang ditentukan. */
export async function requireAdminOrAnyRole(
  sessionId: string,
  roles: RoleId[],
): Promise<RoleGate> {
  if (await isAdminAuthenticated()) return { ok: true };
  return requireAnyRole(sessionId, roles);
}

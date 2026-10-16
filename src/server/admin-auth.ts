/**
 * Autentikasi akun panitia untuk mengelola sesi lomba.
 *
 * `CCL_ADMIN_PIN` menyediakan akses bootstrap; akun tambahan disimpan di
 * PostgreSQL dengan hash scrypt.
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

function getBootstrapEmail(): string {
  const configuredEmail = process.env.CCL_ADMIN_EMAIL;
  return (configuredEmail ?? "admin@ccl.local").trim().toLowerCase();
}

function getBootstrapPin(): string {
  const pin = process.env.CCL_ADMIN_PIN;
  if (!pin || !/^\d{4}$/.test(pin)) {
    throw new Error("CCL_ADMIN_PIN wajib diatur sebagai PIN 4 digit.");
  }
  return pin;
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

export function hashAdminPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyAdminPin(pin: string): AdminIdentity | null {
  if (!safeEqualSecret(pin, getBootstrapPin())) return null;
  return {
    id: BOOTSTRAP_ID,
    name: "Admin",
    email: getBootstrapEmail(),
    role: "admin",
  };
}

export async function getCurrentAdmin(): Promise<AdminIdentity | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  const id = verifyAdminToken(token);
  if (!id) return null;
  if (id === BOOTSTRAP_ID) {
    return {
      id: BOOTSTRAP_ID,
      name: "Admin",
      email: getBootstrapEmail(),
      role: "admin",
    };
  }
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
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
export async function listAdminUsers(): Promise<AdminUserDto[]> {
  const rows = await db
    .select()
    .from(users)
    .orderBy(asc(users.createdAt), asc(users.email));
  return rows.map((row) => ({
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

export async function saveAdminUser(
  input: SaveAdminUserInput,
): Promise<SaveAdminUserOutcome> {
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

  const now = new Date();
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing && existing.id !== input.id) {
      return { status: "duplicate_email" } as const;
    }

    if (input.id) {
      const [current] = await tx
        .select()
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);
      if (!current) return { status: "unknown_user" } as const;
      const patch = {
        name,
        email,
        ...(input.password
          ? { passwordHash: hashAdminPassword(input.password) }
          : {}),
      };
      const [updated] = await tx
        .update(users)
        .set(patch)
        .where(eq(users.id, input.id))
        .returning();
      return {
        status: "saved",
        user: {
          ...toIdentity(updated),
          createdAt: updated.createdAt.toISOString(),
        },
      } as const;
    }

    const row = {
      id: randomUUID(),
      name,
      email,
      passwordHash: hashAdminPassword(input.password!),
      role: "panitia" as const,
      createdAt: now,
    };
    const [created] = await tx.insert(users).values(row).returning();
    return {
      status: "saved",
      user: {
        ...toIdentity(created),
        createdAt: created.createdAt.toISOString(),
      },
    } as const;
  });
}

export type DeleteAdminUserOutcome = "deleted" | "unknown_user";

export async function deleteAdminUser(
  id: string,
): Promise<DeleteAdminUserOutcome> {
  const rows = await db.delete(users).where(eq(users.id, id)).returning({
    id: users.id,
  });
  return rows.length > 0 ? "deleted" : "unknown_user";
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

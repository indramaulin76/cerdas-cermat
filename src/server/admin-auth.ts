/**
 * Identitas admin bootstrap untuk aplikasi yang saat ini tidak memakai login.
 * Akun tambahan disimpan di PostgreSQL dengan hash scrypt.
 */

import "server-only";

import { randomBytes, randomUUID, scryptSync } from "node:crypto";

import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { users, type UserRow } from "@/db/schema";
import type { ModeratorGate, RoleGate } from "@/server/auth";
import type { RoleId } from "@/lib/ccl/roles";

const BOOTSTRAP_ID = "bootstrap-admin";

function getBootstrapEmail(): string {
  const configuredEmail = process.env.CCL_ADMIN_EMAIL;
  return (configuredEmail ?? "admin@ccl.local").trim().toLowerCase();
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

export function hashAdminPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function getCurrentAdmin(): Promise<AdminIdentity> {
  return {
    id: BOOTSTRAP_ID,
    name: "Admin",
    email: getBootstrapEmail(),
    role: "admin",
  };
}

export async function isAdminAuthenticated(): Promise<boolean> {
  return true;
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
  void sessionId;
  return { ok: true };
}

/** Baca data sesi untuk admin atau salah satu peran yang ditentukan. */
export async function requireAdminOrAnyRole(
  sessionId: string,
  roles: RoleId[],
): Promise<RoleGate> {
  void sessionId;
  void roles;
  return { ok: true };
}

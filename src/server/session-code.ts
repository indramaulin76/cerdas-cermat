/**
 * Generator id sesi, link peran, dan PIN peran.
 *
 * Dipakai saat membuat sesi baru (tugas "endpoint buat sesi baru"): id sesi
 * dibuat unik dan ramah link, lalu tiap peran (moderator, layar penonton, HP
 * regu) mendapat PIN 4 digit sendiri. PIN disimpan pada baris sesi sehingga
 * "link dan PIN tetap sama" setiap kali admin membuka ulang detail sesi.
 */

import "server-only";

import { randomBytes, randomInt } from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { sessions } from "@/db/schema";
import { ROLE_ORDER, getRolePath, type RoleId } from "@/lib/ccl/roles";

/** Rentang PIN 4 digit (1000–9999). */
const PIN_MIN = 1000;
const PIN_MAX = 9999;

/** Panjang maksimum bagian judul pada id sesi. */
const SLUG_MAX = 32;

/** Buat PIN 4 digit acak. */
export function generatePin(): string {
  return String(randomInt(PIN_MIN, PIN_MAX + 1));
}

/** Buat PIN berbeda untuk tiap peran pada satu sesi. */
export function generateRolePins(): Record<RoleId, string> {
  const used = new Set<string>();
  const next = (): string => {
    let pin = generatePin();
    while (used.has(pin)) pin = generatePin();
    used.add(pin);
    return pin;
  };

  return {
    moderator: next(),
    viewer: next(),
    team: next(),
  };
}

/** Ubah judul acara menjadi potongan id yang aman untuk URL. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

/** Apakah sebuah id sesi sudah dipakai. */
export async function sessionIdExists(id: string): Promise<boolean> {
  const rows = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);
  return rows.length > 0;
}

/**
 * Buat id sesi unik & ramah link dari judul acara.
 *
 * Bagian judul membantu admin mengenali sesi, sedangkan akhiran acak menjamin
 * keunikan. Bila bentrok (sangat jarang), coba lagi dengan akhiran baru.
 */
export async function generateSessionId(title?: string): Promise<string> {
  const base = title ? slugify(title) : "";

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const suffix = randomBytes(3).toString("hex"); // 6 karakter
    const id = base ? `${base}-${suffix}` : `sesi-${suffix}`;
    if (!(await sessionIdExists(id))) return id;
  }

  // Cadangan: id acak panjang, praktis tak mungkin bentrok.
  return `sesi-${randomBytes(8).toString("hex")}`;
}

/** Link halaman sebuah peran untuk sesi (stabil & unik per sesi+peran). */
export function roleLink(sessionId: string, role: RoleId): string {
  return getRolePath(sessionId, role);
}

/** Ketiga link peran sekaligus, siap ditampilkan di halaman detail sesi. */
export function sessionLinks(sessionId: string): Record<RoleId, string> {
  return ROLE_ORDER.reduce(
    (links, role) => {
      links[role] = roleLink(sessionId, role);
      return links;
    },
    {} as Record<RoleId, string>,
  );
}

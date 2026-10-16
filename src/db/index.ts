/**
 * Klien basis data SQLite (Drizzle ORM).
 *
 * Hanya boleh diimpor dari kode server (route handler / server action),
 * bukan dari komponen klien. Gunakan `import { db } from "@/db"`.
 */

import "server-only";

import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

/** Lokasi berkas basis data, bisa ditimpa lewat env `DATABASE_URL`. */
const databaseUrl = process.env.DATABASE_URL ?? "./data/ccl.db";

// Pastikan folder penampung ada sebelum better-sqlite3 membuka berkasnya.
if (databaseUrl !== ":memory:" && !existsSync(databaseUrl)) {
  mkdirSync(dirname(databaseUrl), { recursive: true });
}

const sqlite = new Database(databaseUrl);

// WAL membuat baca/tulis bersamaan lebih lancar saat lomba berlangsung,
// dan foreign_keys memastikan relasi regu ↔ tekanan tetap konsisten.
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

export { schema };
export type Database = typeof db;

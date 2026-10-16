import { defineConfig } from "drizzle-kit";

/**
 * Konfigurasi Drizzle Kit.
 *
 * Aplikasi memakai SQLite sebagai basis data (lihat PRD bagian 6).
 * `db:generate` membuat berkas migrasi SQL dari perubahan `src/db/schema.ts`,
 * sedangkan `db:migrate` menjalankan migrasi tersebut ke berkas basis data.
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "./data/ccl.db",
  },
  strict: true,
  verbose: true,
});

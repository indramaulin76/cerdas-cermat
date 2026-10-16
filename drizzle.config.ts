import { defineConfig } from "drizzle-kit";

/**
 * Konfigurasi Drizzle Kit.
 *
 * Aplikasi memakai PostgreSQL Neon saat dijalankan atau dimigrasikan.
 * `db:generate` membuat berkas migrasi SQL dari perubahan `src/db/schema.ts`,
 * sedangkan `db:migrate` menjalankan migrasi tersebut ke berkas basis data.
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle-postgres",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});

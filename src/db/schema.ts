/**
 * Skema basis data Cerdas Cermat Live.
 *
 * Ditulis dengan Drizzle ORM untuk SQLite. Bentuk kolom mengikuti
 * "Database Schema" pada PRD (bagian 6) agar cocok dengan kontrak API
 * yang dipakai dashboard regu, moderator, dan layar penonton.
 *
 * Catatan: tabel `teams` dan `buzz_events` adalah fondasi untuk fitur
 * "Tombol Jawab Regu". Tabel sesi/ronde/user menyusul pada tugas berikutnya.
 */

import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/** Regu peserta lomba (`teams`). */
export const teams = sqliteTable(
  "teams",
  {
    id: text("id").primaryKey(),
    /** Relasi ke sesi lomba (`sessions.id`). */
    sessionId: text("session_id").notNull(),
    /** Nama regu yang tampil di layar, mis. "Regu Elang". */
    name: text("name").notNull(),
    /** Warna identitas regu (hex) untuk aksen tombol & papan skor. */
    color: text("color").notNull(),
    /** Skor saat ini. */
    score: integer("score").notNull().default(0),
    /** Waktu dibuat (epoch milidetik). */
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("teams_session_id_idx").on(table.sessionId),
    // Satu nama regu unik dalam satu sesi.
    uniqueIndex("teams_session_name_unq").on(table.sessionId, table.name),
  ],
);

/** Catatan tekanan tombol jawab (`buzz_events`). */
export const buzzEvents = sqliteTable(
  "buzz_events",
  {
    id: text("id").primaryKey(),
    /** Relasi ke sesi lomba (`sessions.id`). */
    sessionId: text("session_id").notNull(),
    /** Regu yang menekan tombol. */
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    /** Relasi ke soal/ronde (`rounds.id`), boleh kosong bila ronde belum ada. */
    roundId: text("round_id"),
    /** Kecepatan reaksi sejak soal dibuka (milidetik). */
    reactionMs: integer("reaction_ms").notNull(),
    /** Penanda regu tercepat pada ronde ini. */
    isFirst: integer("is_first", { mode: "boolean" })
      .notNull()
      .default(false),
    /** Waktu tekan (epoch milidetik). */
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("buzz_events_session_id_idx").on(table.sessionId),
    index("buzz_events_round_id_idx").on(table.roundId),
    index("buzz_events_team_id_idx").on(table.teamId),
    // Satu regu hanya boleh menekan sekali per ronde.
    uniqueIndex("buzz_events_round_team_unq").on(table.roundId, table.teamId),
  ],
);

/** Bentuk baris tabel `teams`. */
export type TeamRow = typeof teams.$inferSelect;
/** Bentuk baris baru tabel `teams`. */
export type NewTeamRow = typeof teams.$inferInsert;

/** Bentuk baris tabel `buzz_events`. */
export type BuzzEventRow = typeof buzzEvents.$inferSelect;
/** Bentuk baris baru tabel `buzz_events`. */
export type NewBuzzEventRow = typeof buzzEvents.$inferInsert;

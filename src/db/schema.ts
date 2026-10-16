/**
 * Skema basis data Cerdas Cermat Live.
 *
 * Ditulis dengan Drizzle ORM untuk SQLite. Bentuk kolom mengikuti
 * "Database Schema" pada PRD (bagian 6) agar cocok dengan kontrak API
 * yang dipakai dashboard regu, moderator, dan layar penonton.
 *
 * Catatan: tabel `sessions`, `teams`, `rounds`, dan `buzz_events` menopang
 * fitur "Tombol Jawab Regu" sekaligus "Dashboard Moderator". Tabel `sessions`
 * juga menyimpan PIN tiap peran (moderator/penonton/regu) yang menjadi dasar
 * tiga link pada fitur "Sesi & Link". Tabel akun panitia menyusul pada tugas
 * fitur Login Admin.
 */

import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/** Sesi lomba (`sessions`). */
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull().default("Cerdas Cermat Live"),
    /** PIN masuk moderator untuk sesi ini. */
    moderatorPin: text("moderator_pin"),
    /** PIN masuk layar penonton untuk sesi ini. */
    viewerPin: text("viewer_pin"),
    /** PIN masuk HP regu untuk sesi ini. */
    teamPin: text("team_pin"),
    cooldownSeconds: integer("cooldown_seconds").notNull().default(10),
    correctPoints: integer("correct_points").notNull().default(100),
    wrongPoints: integer("wrong_points").notNull().default(-50),
    status: text("status", { enum: ["draft", "active", "finished"] })
      .notNull()
      .default("draft"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    // Daftar sesi ditampilkan terbaru lebih dulu.
    index("sessions_created_at_idx").on(table.createdAt),
    // Saring sesi menurut status (draft/active/finished).
    index("sessions_status_idx").on(table.status),
  ],
);

/** Regu peserta lomba (`teams`). */
export const teams = sqliteTable(
  "teams",
  {
    id: text("id").primaryKey(),
    /** Relasi ke sesi lomba (`sessions.id`). */
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
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

/** Soal/ronde (`rounds`). */
export const rounds = sqliteTable(
  "rounds",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    orderNumber: integer("order_number").notNull().default(0),
    status: text("status", { enum: ["draft", "open", "closed"] })
      .notNull()
      .default("draft"),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    endedAt: integer("ended_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [index("rounds_session_id_idx").on(table.sessionId)],
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
    roundId: text("round_id").references(() => rounds.id, {
      onDelete: "set null",
    }),
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

/** Bentuk baris tabel `rounds`. */
export type RoundRow = typeof rounds.$inferSelect;
/** Bentuk baris baru tabel `rounds`. */
export type NewRoundRow = typeof rounds.$inferInsert;

/** Bentuk baris tabel `sessions`. */
export type SessionRow = typeof sessions.$inferSelect;
/** Bentuk baris baru tabel `sessions`. */
export type NewSessionRow = typeof sessions.$inferInsert;

/** Bentuk baris tabel `buzz_events`. */
export type BuzzEventRow = typeof buzzEvents.$inferSelect;
/** Bentuk baris baru tabel `buzz_events`. */
export type NewBuzzEventRow = typeof buzzEvents.$inferInsert;

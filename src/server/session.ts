/**
 * Logika server untuk sesi lomba dan pengaturannya.
 *
 * Moderator mengatur jendela waktu jawab (`cooldown_seconds`) dan poin dari satu
 * layar. Nilai-nilai ini dipakai aba-aba regu dan perhitungan skor, lalu
 * disiarkan agar semua klien ikut sinkron.
 */

import "server-only";

import { count, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  sessions,
  teams,
  type NewSessionRow,
  type SessionRow,
} from "@/db/schema";
import type {
  SessionDetailDto,
  SessionDto,
  SessionSummaryDto,
} from "@/lib/ccl/api";
import { generateRolePins, generateSessionId, sessionLinks } from "@/server/session-code";

/** Ubah baris sesi menjadi DTO untuk dikirim ke klien. */
export function toSessionDto(row: SessionRow): SessionDto {
  return {
    id: row.id,
    title: row.title,
    cooldownSeconds: row.cooldownSeconds,
    correctPoints: row.correctPoints,
    wrongPoints: row.wrongPoints,
    status: row.status as "draft" | "active" | "finished",
  };
}

/**
 * Ubah baris sesi menjadi detail lengkap untuk halaman admin: pengaturan,
 * ditambah link dan PIN tiap peran.
 */
export function toSessionDetailDto(row: SessionRow): SessionDetailDto {
  return {
    ...toSessionDto(row),
    createdAt: row.createdAt.toISOString(),
    links: sessionLinks(row.id),
    pins: {
      moderator: row.moderatorPin ?? "",
      viewer: row.viewerPin ?? "",
      team: row.teamPin ?? "",
    },
  };
}

/** Ambil semua sesi, terbaru lebih dulu, beserta jumlah regu peserta. */
export function listSessions(): SessionSummaryDto[] {
  const rows = db
    .select({
      id: sessions.id,
      title: sessions.title,
      status: sessions.status,
      createdAt: sessions.createdAt,
      teamCount: count(teams.id),
    })
    .from(sessions)
    .leftJoin(teams, eq(teams.sessionId, sessions.id))
    .groupBy(sessions.id)
    .orderBy(desc(sessions.createdAt))
    .all();

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status as "draft" | "active" | "finished",
    createdAt: row.createdAt.toISOString(),
    teamCount: Number(row.teamCount),
  }));
}

/** Ambil satu sesi, atau `undefined` bila tak ada. */
export function getSession(sessionId: string): SessionRow | undefined {
  return db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
}

/** Masukan pengaturan sesi. */
export type UpdateSettingsInput = {
  sessionId: string;
  cooldownSeconds?: number;
};

/** Hasil pengaturan sesi. */
export type UpdateSettingsOutcome =
  | { status: "updated"; row: SessionRow }
  | { status: "unknown_session"; sessionId: string }
  | { status: "invalid" };

export type SessionStatus = "draft" | "active" | "finished";

export function updateSessionStatus(
  sessionId: string,
  status: SessionStatus,
): SessionRow | undefined {
  const now = new Date();
  const existing = db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get();
  if (!existing) return undefined;
  db.update(sessions)
    .set({ status, updatedAt: now })
    .where(eq(sessions.id, sessionId))
    .run();
  return { ...existing, status, updatedAt: now };
}

/**
 * Ubah pengaturan sesi.
 *
 * Durasi menjawab dibatasi 1..600 detik agar tidak mengganggu jalannya lomba.
 */
export function updateSessionSettings(
  input: UpdateSettingsInput,
): UpdateSettingsOutcome {
  const { sessionId } = input;

  const patch: Partial<Pick<SessionRow, "cooldownSeconds">> = {};

  if (input.cooldownSeconds !== undefined) {
    if (
      !Number.isFinite(input.cooldownSeconds) ||
      input.cooldownSeconds < 1 ||
      input.cooldownSeconds > 600
    ) {
      return { status: "invalid" } as const;
    }
    patch.cooldownSeconds = Math.round(input.cooldownSeconds);
  }

  if (Object.keys(patch).length === 0) {
    return { status: "invalid" } as const;
  }

  return db.transaction((tx) => {
    const row = tx
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!row) {
      return { status: "unknown_session", sessionId } as const;
    }

    const now = new Date();
    tx.update(sessions)
      .set({ ...patch, updatedAt: now })
      .where(eq(sessions.id, sessionId))
      .run();

    return { status: "updated", row: { ...row, ...patch, updatedAt: now } } as const;
  });
}

/** Masukan pembuatan sesi lomba baru. */
export type CreateSessionInput = {
  /** Nama acara/cerdas cermat. */
  title: string;
};

/**
 * Buat sesi lomba baru.
 *
 * Id sesi dibuat unik & ramah link, lalu tiap peran mendapat PIN sendiri. Sesi
 * lahir berstatus `draft` sampai admin mengaktifkannya, dan memakai nilai awal
 * pengaturan durasi dari sesi terakhir (atau 10 detik bila belum ada sesi).
 */
export function createSession(input: CreateSessionInput): SessionRow {
  const id = generateSessionId(input.title);
  const pins = generateRolePins();
  const now = new Date();
  const previousSettings = db
    .select({
      cooldownSeconds: sessions.cooldownSeconds,
    })
    .from(sessions)
    .orderBy(desc(sessions.updatedAt), desc(sessions.createdAt))
    .get();

  const row: NewSessionRow = {
    id,
    title: input.title,
    moderatorPin: pins.moderator,
    viewerPin: pins.viewer,
    teamPin: pins.team,
    cooldownSeconds: previousSettings?.cooldownSeconds ?? 10,
    correctPoints: 100,
    wrongPoints: -50,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };

  return db.insert(sessions).values(row).returning().get();
}

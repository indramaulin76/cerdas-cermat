/**
 * Logika server untuk regu dan skor.
 *
 * Moderator menambah/mengurangi poin regu saat lomba berjalan. Perubahan skor
 * disiarkan lewat SSE supaya papan skor moderator dan layar penonton ikut
 * bergerak seketika.
 */

import "server-only";

import { randomUUID } from "node:crypto";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { sessions, teams, type NewTeamRow, type TeamRow } from "@/db/schema";
import type { TeamDto } from "@/lib/ccl/api";
import { nextTeamColor } from "@/lib/ccl/team-colors";

/** Batas maksimal regu per sesi (sesuai PRD). */
export const MAX_TEAMS = 10;

/** Panjang maksimal nama regu. */
export const MAX_TEAM_NAME_LENGTH = 60;

/** Ubah baris regu menjadi DTO untuk dikirim ke klien. */
export function toTeamDto(row: TeamRow): TeamDto {
  return {
    id: row.id,
    sessionId: row.sessionId,
    name: row.name,
    color: row.color,
    score: row.score,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Daftar regu sebuah sesi, diurutkan sesuai waktu dibuat. */
export function listTeams(sessionId: string): TeamRow[] {
  return db
    .select()
    .from(teams)
    .where(eq(teams.sessionId, sessionId))
    .orderBy(asc(teams.createdAt), asc(teams.id))
    .all();
}

/** Ubah nama regu menjadi id yang aman untuk URL. */
function slugifyTeamName(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return slug || "regu";
}

/** Pastikan id regu unik secara global (id regu adalah kunci utama). */
function uniqueTeamId(name: string): string {
  const base = slugifyTeamName(name);
  const taken = (id: string) =>
    Boolean(
      db.select({ id: teams.id }).from(teams).where(eq(teams.id, id)).get(),
    );

  if (!taken(base)) return base;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${base}-${randomUUID().slice(0, 6)}`;
    if (!taken(candidate)) return candidate;
  }
  return randomUUID();
}

/** Perluas hex pendek (#abc) menjadi enam digit (#aabbcc). */
function normalizeHexColor(hex: string): string {
  if (hex.length === 4) {
    const [, r, g, b] = hex;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return hex;
}

/** Masukan pembuatan regu. */
export type CreateTeamInput = {
  sessionId: string;
  name: string;
  /** Warna identitas opsional (hex). Bila kosong, dipilih otomatis. */
  color?: string | null;
};

/** Hasil pembuatan regu. */
export type CreateTeamOutcome =
  | { status: "created"; row: TeamRow }
  | { status: "unknown_session"; sessionId: string }
  | { status: "invalid_name"; reason: "empty" | "too_long" }
  | { status: "duplicate_name"; name: string }
  | { status: "limit_reached"; max: number }
  | { status: "invalid_color" };

/**
 * Tambah regu baru ke sebuah sesi.
 *
 * Aturan yang ditegakkan server:
 * - Sesi harus ada.
 * - Nama wajib diisi, tidak mengandung hanya spasi, dan tidak melebihi batas.
 * - Nama tidak boleh sama dengan regu lain pada sesi yang sama (abaikan
 *   besar/kecil huruf).
 * - Jumlah regu dibatasi `MAX_TEAMS`.
 * - Bila warna tidak diberikan, dipilih dari palet yang belum terpakai.
 */
export function createTeam(input: CreateTeamInput): CreateTeamOutcome {
  const name = input.name.trim().replace(/\s+/g, " ");

  if (name === "") {
    return { status: "invalid_name", reason: "empty" } as const;
  }
  if (name.length > MAX_TEAM_NAME_LENGTH) {
    return { status: "invalid_name", reason: "too_long" } as const;
  }

  let color: string | null = null;
  if (input.color !== undefined && input.color !== null && input.color !== "") {
    const normalized = input.color.trim().toLowerCase();
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(normalized)) {
      return { status: "invalid_color" } as const;
    }
    color = normalizeHexColor(normalized);
  }

  return db.transaction((tx) => {
    const session = tx
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.id, input.sessionId))
      .get();

    if (!session) {
      return { status: "unknown_session", sessionId: input.sessionId } as const;
    }

    const existing = tx
      .select()
      .from(teams)
      .where(eq(teams.sessionId, input.sessionId))
      .all();

    if (existing.length >= MAX_TEAMS) {
      return { status: "limit_reached", max: MAX_TEAMS } as const;
    }

    const lowered = name.toLowerCase();
    if (existing.some((team) => team.name.trim().toLowerCase() === lowered)) {
      return { status: "duplicate_name", name } as const;
    }

    const chosenColor = color ?? nextTeamColor(existing.map((t) => t.color));
    const now = new Date();

    const row: NewTeamRow = {
      id: uniqueTeamId(name),
      sessionId: input.sessionId,
      name,
      color: chosenColor,
      score: 0,
      createdAt: now,
    };

    tx.insert(teams).values(row).run();

    const created: TeamRow = {
      id: row.id,
      sessionId: input.sessionId,
      name,
      color: chosenColor,
      score: 0,
      createdAt: now,
    };

    return { status: "created", row: created } as const;
  });
}

/** Masukan pembaruan skor. */
export type UpdateScoreInput = {
  sessionId: string;
  teamId: string;
  /** Poin eksplisit; dipakai bila `outcome` tidak diberikan. */
  delta?: number;
  /** Aturan sesi yang dipakai bila `delta` tidak diberikan. */
  outcome?: "correct" | "wrong";
};

/** Hasil pembaruan skor. */
export type UpdateScoreOutcome =
  | { status: "updated"; row: TeamRow; delta: number }
  | { status: "unknown_team"; teamId: string }
  | { status: "unknown_session"; sessionId: string }
  | { status: "invalid" };

/**
 * Tambah/kurang poin sebuah regu.
 *
 * Bila `delta` diberikan, itulah yang diterapkan. Bila `outcome` diberikan,
 * poin diambil dari aturan sesi (`correct_points` / `wrong_points`).
 * Skor boleh menjadi negatif.
 */
export function updateTeamScore(input: UpdateScoreInput): UpdateScoreOutcome {
  const { sessionId, teamId } = input;

  return db.transaction((tx) => {
    const session = tx
      .select({
        correctPoints: sessions.correctPoints,
        wrongPoints: sessions.wrongPoints,
      })
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return { status: "unknown_session", sessionId } as const;
    }

    let delta: number;
    if (typeof input.delta === "number" && Number.isFinite(input.delta)) {
      delta = Math.round(input.delta);
    } else if (input.outcome === "correct") {
      delta = session.correctPoints;
    } else if (input.outcome === "wrong") {
      delta = session.wrongPoints;
    } else {
      return { status: "invalid" } as const;
    }

    const team = tx
      .select()
      .from(teams)
      .where(and(eq(teams.id, teamId), eq(teams.sessionId, sessionId)))
      .get();

    if (!team) {
      return { status: "unknown_team", teamId } as const;
    }

    const nextScore = team.score + delta;
    tx.update(teams).set({ score: nextScore }).where(eq(teams.id, teamId)).run();

    return {
      status: "updated",
      row: { ...team, score: nextScore },
      delta,
    } as const;
  });
}

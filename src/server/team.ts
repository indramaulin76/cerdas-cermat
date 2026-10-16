/**
 * Logika server untuk regu dan skor.
 *
 * Moderator menambah/mengurangi poin regu saat lomba berjalan. Perubahan skor
 * disiarkan lewat SSE supaya papan skor moderator dan layar penonton ikut
 * bergerak seketika.
 */

import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { sessions, teams, type TeamRow } from "@/db/schema";
import type { TeamDto } from "@/lib/ccl/api";

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

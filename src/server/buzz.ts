/**
 * Logika server untuk mencatat tekanan tombol jawab regu.
 *
 * Semua penulisan lewat satu transaksi SQLite yang sinkron, sehingga dua regu
 * yang menekan nyaris bersamaan tetap menghasilkan satu pemenang secara
 * konsisten: tekanan pertama yang masuk transaksi itulah yang ditandai
 * `isFirst`.
 */

import "server-only";

import { randomUUID } from "node:crypto";

import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  buzzEvents,
  teams,
  type BuzzEventRow,
} from "@/db/schema";
import type { BuzzEventDto } from "@/lib/ccl/api";

/** Masukan untuk mencatat satu tekanan. */
export type RecordBuzzInput = {
  sessionId: string;
  teamId: string;
  roundId?: string | null;
  reactionMs: number;
};

/** Hasil operasi pencatatan tekanan. */
export type RecordBuzzOutcome =
  | { status: "recorded"; row: BuzzEventRow; order: number; duplicate: false }
  | { status: "duplicate"; row: BuzzEventRow; order: number; duplicate: true }
  | { status: "unknown_team"; teamId: string };

/** Batas cakupan ronde: cocokkan `round_id` yang sama (termasuk sama-sama null). */
function roundScope(roundId: string | null) {
  return roundId === null
    ? isNull(buzzEvents.roundId)
    : eq(buzzEvents.roundId, roundId);
}

/**
 * Catat tekanan tombol dari sebuah regu.
 *
 * - Menolak regu yang tidak dikenal pada sesi tersebut (`unknown_team`).
 * - Tekanan pertama pada cakupan ronde ditandai `isFirst`.
 * - Tekanan ulang dari regu yang sama tidak menambah baris baru, melainkan
 *   mengembalikan catatan yang sudah ada (`duplicate`).
 */
export function recordBuzz(input: RecordBuzzInput): RecordBuzzOutcome {
  const { sessionId, teamId } = input;
  const roundId = input.roundId ?? null;
  const reactionMs = Math.max(0, Math.round(input.reactionMs));

  return db.transaction((tx) => {
    const team = tx
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.id, teamId), eq(teams.sessionId, sessionId)))
      .get();

    if (!team) {
      return { status: "unknown_team", teamId } as const;
    }

    const scope = and(
      eq(buzzEvents.sessionId, sessionId),
      roundScope(roundId),
    );

    const ordered = tx
      .select()
      .from(buzzEvents)
      .where(scope)
      .orderBy(asc(buzzEvents.createdAt), asc(buzzEvents.id))
      .all();

    const existingIndex = ordered.findIndex((event) => event.teamId === teamId);
    if (existingIndex >= 0) {
      return {
        status: "duplicate",
        row: ordered[existingIndex],
        order: existingIndex + 1,
        duplicate: true,
      } as const;
    }

    const order = ordered.length + 1;
    const row: BuzzEventRow = {
      id: randomUUID(),
      sessionId,
      teamId,
      roundId,
      reactionMs,
      isFirst: order === 1,
      createdAt: new Date(),
    };

    tx.insert(buzzEvents).values(row).run();

    return { status: "recorded", row, order, duplicate: false } as const;
  });
}

/** Ubah baris basis data menjadi DTO untuk dikirim ke klien. */
export function toBuzzEventDto(row: BuzzEventRow): BuzzEventDto {
  return {
    id: row.id,
    sessionId: row.sessionId,
    teamId: row.teamId,
    roundId: row.roundId,
    reactionMs: row.reactionMs,
    isFirst: row.isFirst,
    createdAt: row.createdAt.toISOString(),
  };
}

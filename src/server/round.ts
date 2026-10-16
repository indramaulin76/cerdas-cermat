import "server-only";

import { randomUUID } from "node:crypto";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { buzzEvents, rounds, type BuzzEventRow, type RoundRow } from "@/db/schema";
import type { QuestionPhase, RoundDto } from "@/lib/ccl/api";
import { rankBuzzes } from "@/server/buzz";

export type OpenRoundInput = {
  sessionId: string;
};

export type OpenRoundOutcome = {
  status: "opened";
  row: RoundRow;
};

/** Cari soal/ronde yang sedang terbuka untuk sebuah sesi. */
function findOpenRound(sessionId: string): RoundRow | undefined {
  return db
    .select()
    .from(rounds)
    .where(and(eq(rounds.sessionId, sessionId), eq(rounds.status, "open")))
    .orderBy(desc(rounds.orderNumber), desc(rounds.createdAt))
    .get();
}

export function toRoundDto(row: RoundRow): RoundDto {
  return {
    id: row.id,
    sessionId: row.sessionId,
    orderNumber: row.orderNumber,
    status: row.status as "draft" | "open" | "closed",
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export type RoundStatusOutcome = {
  phase: QuestionPhase;
  round: RoundRow | null;
  ranking: BuzzEventRow[];
  winner: BuzzEventRow | null;
};

/**
 * Status soal saat ini untuk moderator.
 *
 * - `idle`   — belum ada soal yang dibuka.
 * - `open`   — soal terbuka, belum ada regu menekan.
 * - `locked` — sudah ada regu menekan (jawaban terkunci).
 */
export function getRoundStatus(sessionId: string): RoundStatusOutcome {
  const round = findOpenRound(sessionId);
  if (!round) {
    return { phase: "idle", round: null, ranking: [], winner: null };
  }

  const rows = db
    .select()
    .from(buzzEvents)
    .where(
      and(eq(buzzEvents.sessionId, sessionId), eq(buzzEvents.roundId, round.id)),
    )
    .all();

  const ranking = rankBuzzes(rows);

  return {
    phase: ranking.length > 0 ? "locked" : "open",
    round,
    ranking,
    winner: ranking[0] ?? null,
  };
}

export type ResetRoundOutcome = {
  /** Ronde yang ditutup, atau `null` bila memang tidak ada soal aktif. */
  closed: RoundRow | null;
};

/**
 * Kosongkan/ulang ronde: tutup soal yang sedang terbuka.
 *
 * Karena tidak ada lagi ronde terbuka, urutan jawab dianggap bersih dan tombol
 * semua regu kembali ke keadaan siap menunggu tanpa menghapus catatan sejarah.
 */
export function resetRound(sessionId: string): ResetRoundOutcome {
  return db.transaction((tx) => {
    const round = tx
      .select()
      .from(rounds)
      .where(and(eq(rounds.sessionId, sessionId), eq(rounds.status, "open")))
      .orderBy(desc(rounds.orderNumber), desc(rounds.createdAt))
      .get();

    if (!round) {
      return { closed: null } as const;
    }

    const now = new Date();
    tx.update(rounds)
      .set({ status: "closed", endedAt: now })
      .where(eq(rounds.id, round.id))
      .run();

    return { closed: { ...round, status: "closed", endedAt: now } } as const;
  });
}

export function openRound(input: OpenRoundInput): OpenRoundOutcome {
  const { sessionId } = input;

  return db.transaction((tx) => {
    const now = new Date();

    // Tutup ronde yang masih terbuka supaya hanya ada satu soal aktif.
    // Inilah "reset kunci": membuka soal baru membuka kembali kunci semua regu.
    tx.update(rounds)
      .set({ status: "closed", endedAt: now })
      .where(and(eq(rounds.sessionId, sessionId), eq(rounds.status, "open")))
      .run();

    const lastRound = tx
      .select()
      .from(rounds)
      .where(eq(rounds.sessionId, sessionId))
      .orderBy(desc(rounds.orderNumber), desc(rounds.createdAt))
      .get();

    const orderNumber = lastRound ? lastRound.orderNumber + 1 : 1;

    const row: RoundRow = {
      id: randomUUID(),
      sessionId,
      orderNumber,
      status: "open",
      startedAt: now,
      endedAt: null,
      createdAt: now,
    };

    tx.insert(rounds).values(row).run();

    return { status: "opened", row } as const;
  });
}

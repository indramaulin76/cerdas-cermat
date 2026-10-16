/**
 * Logika server untuk mencatat tekanan tombol jawab regu.
 *
 * Semua penulisan lewat satu transaksi SQLite yang sinkron, sehingga dua regu
 * yang menekan nyaris bersamaan tetap menghasilkan satu pemenang secara
 * konsisten. Urutan akhir dihitung ulang setiap ada tekanan baru memakai
 * `reactionMs` (kecepatan reaksi yang sama-sama diukur dari aba-aba), dan bila
 * dua reaksi bedanya dalam batas toleransi, waktu tiba di server yang
 * menentukan — supaya regu yang benar-benar lebih dulu menekan tetap menang
 * meski jaringannya sedikit lebih lambat.
 */

import "server-only";

import { randomUUID } from "node:crypto";

import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { buzzEvents, rounds, teams, type BuzzEventRow } from "@/db/schema";
import type { BuzzEventDto, HighlightDto } from "@/lib/ccl/api";

/**
 * Selisih reaksi (ms) yang dianggap "hampir bersamaan".
 *
 * Bila dua regu menekan dalam rentang ini, urutan ditentukan waktu tiba di
 * server, bukan selisih milidetik yang bisa goyang karena jitter jaringan.
 */
export const TIE_TOLERANCE_MS = 50;

/** Masukan untuk mencatat satu tekanan. */
export type RecordBuzzInput = {
  sessionId: string;
  teamId: string;
  roundId: string;
};

/** Hasil operasi pencatatan tekanan. */
export type RecordBuzzOutcome =
  | {
      status: "recorded" | "duplicate";
      row: BuzzEventRow;
      order: number;
      duplicate: boolean;
      ranking: BuzzEventRow[];
    }
  | { status: "unknown_team"; teamId: string }
  | { status: "round_not_open" };

/** Batas cakupan ronde: cocokkan `round_id` yang sama (termasuk sama-sama null). */
function roundScope(roundId: string | null) {
  return roundId === null
    ? isNull(buzzEvents.roundId)
    : eq(buzzEvents.roundId, roundId);
}

/** Urutkan tekanan murni berdasarkan reaksi, lalu waktu tiba, lalu id. */
function compareBuzz(a: BuzzEventRow, b: BuzzEventRow): number {
  if (a.reactionMs !== b.reactionMs) return a.reactionMs - b.reactionMs;
  const time = a.createdAt.getTime() - b.createdAt.getTime();
  if (time !== 0) return time;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Hitung urutan tekanan sebuah ronde.
 *
 * Dasar urutan adalah `reactionMs` (adil, sama-sama diukur dari aba-aba).
 * Namun bila reaksi peringkat dua berada dalam `TIE_TOLERANCE_MS` dari
 * peringkat satu dan ternyata tiba di server lebih dulu, keduanya dianggap
 * seri dan waktu tiba yang menang. Hasilnya deterministik dan konsisten:
 * satu pemenang, tanpa bergetar karena jitter.
 */
export function rankBuzzes(rows: BuzzEventRow[]): BuzzEventRow[] {
  const ranked = [...rows].sort(compareBuzz);

  if (ranked.length >= 2) {
    const [first, second] = ranked;
    const withinTolerance =
      second.reactionMs - first.reactionMs <= TIE_TOLERANCE_MS;
    const secondArrivedEarlier =
      second.createdAt.getTime() < first.createdAt.getTime() ||
      (second.createdAt.getTime() === first.createdAt.getTime() &&
        second.id < first.id);

    if (withinTolerance && secondArrivedEarlier) {
      ranked[0] = second;
      ranked[1] = first;
    }
  }

  return ranked;
}

/**
 * Catat tekanan tombol dari sebuah regu.
 *
 * - Menolak regu yang tidak dikenal pada sesi tersebut (`unknown_team`).
 * - Tekanan ulang dari regu yang sama tidak menambah baris baru, melainkan
 *   mengembalikan catatan yang sudah ada (`duplicate`).
 * - Setelah setiap tekanan baru, urutan & penanda tercepat dihitung ulang
 *   sehingga seri hampir bersamaan tetap konsisten.
 */
export function recordBuzz(input: RecordBuzzInput): RecordBuzzOutcome {
  const { sessionId, teamId } = input;

  return db.transaction((tx) => {
    const team = tx
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.id, teamId), eq(teams.sessionId, sessionId)))
      .get();

    if (!team) {
      return { status: "unknown_team", teamId } as const;
    }

    const round = tx
      .select()
      .from(rounds)
      .where(
        and(
          eq(rounds.id, input.roundId),
          eq(rounds.sessionId, sessionId),
          eq(rounds.status, "open"),
        ),
      )
      .get();
    if (
      !round ||
      round.startedAt === null ||
      round.answeringTeamId !== null ||
      round.awaitingNext
    ) {
      return { status: "round_not_open" } as const;
    }

    const receivedAt = new Date();
    const nowMs = receivedAt.getTime();
    const startedAtMs = round.startedAt.getTime();

    const roundId = round.id;
    const scope = and(eq(buzzEvents.sessionId, sessionId), roundScope(roundId));

    const existing = tx
      .select()
      .from(buzzEvents)
      .where(and(scope, eq(buzzEvents.teamId, teamId)))
      .get();

    if (!existing) {
      const row: BuzzEventRow = {
        id: `${process.hrtime.bigint().toString().padStart(24, "0")}-${randomUUID()}`,
        sessionId,
        teamId,
        roundId,
        reactionMs: Math.max(0, nowMs - startedAtMs),
        // Ditentukan ulang di bawah; nilai awal sekadar pengisi.
        isFirst: false,
        answerStatus: null,
        createdAt: receivedAt,
      };
      tx.insert(buzzEvents).values(row).run();
    }

    // Hitung ulang urutan seluruh tekanan ronde ini, lalu simpan penanda
    // tercepat bila berubah.
    const rows = tx.select().from(buzzEvents).where(scope).all();
    const ranked = rankBuzzes(rows);

    ranked.forEach((row, index) => {
      const shouldBeFirst = index === 0;
      if (row.isFirst !== shouldBeFirst) {
        tx.update(buzzEvents)
          .set({ isFirst: shouldBeFirst })
          .where(eq(buzzEvents.id, row.id))
          .run();
        row.isFirst = shouldBeFirst;
      }
    });

    const index = ranked.findIndex((row) => row.teamId === teamId);
    const row = ranked[index];

    return {
      status: existing ? "duplicate" : "recorded",
      row,
      order: index + 1,
      duplicate: Boolean(existing),
      ranking: ranked,
    } as const;
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
    answerStatus: row.answerStatus,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Bentuk sorotan regu tercepat untuk layar penonton.
 *
 * `null` (tanpa tekanan) menghasilkan sorotan kosong, dipakai saat soal baru
 * dibuka atau diulang supaya sorotan lama langsung hilang.
 */
export function toHighlightDto(row: BuzzEventRow | null): HighlightDto {
  return {
    teamId: row?.teamId ?? null,
    event: row ? toBuzzEventDto(row) : null,
  };
}

/** Cari ronde yang sedang terbuka untuk sebuah sesi. */
function findOpenRoundId(sessionId: string): string | null {
  const open = db
    .select({ id: rounds.id })
    .from(rounds)
    .where(and(eq(rounds.sessionId, sessionId), eq(rounds.status, "open")))
    .orderBy(desc(rounds.orderNumber), desc(rounds.createdAt))
    .get();
  return open?.id ?? null;
}

/** Masukan untuk mengambil urutan jawab. */
export type BuzzOrderInput = {
  sessionId: string;
  /** Bila kosong, pakai soal yang sedang terbuka. */
  roundId?: string | null;
};

/** Hasil urutan jawab regu tercepat. */
export type BuzzOrderOutcome = {
  roundId: string | null;
  /** Urutan tekanan (indeks 0 = tercepat). */
  ranking: BuzzEventRow[];
  winner: BuzzEventRow | null;
};

/**
 * Urutan jawab regu tercepat pada sebuah ronde.
 *
 * Urutan memakai aturan yang sama dengan pencatatan tekanan (termasuk
 * penanganan seri hampir bersamaan), sehingga moderator melihat hasil yang
 * konsisten dengan yang disiarkan ke HP regu.
 */
export function getBuzzOrder(input: BuzzOrderInput): BuzzOrderOutcome {
  const { sessionId } = input;
  const roundId = input.roundId ?? findOpenRoundId(sessionId);

  const scope = and(eq(buzzEvents.sessionId, sessionId), roundScope(roundId));
  const ranking = rankBuzzes(db.select().from(buzzEvents).where(scope).all());

  return { roundId, ranking, winner: ranking[0] ?? null };
}

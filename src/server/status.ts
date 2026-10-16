import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  buzzEvents,
  rounds,
  teams,
  type BuzzEventRow,
  type RoundRow,
} from "@/db/schema";
import { rankBuzzes } from "@/server/buzz";

export type TeamStatusInput = {
  sessionId: string;
  teamId: string;
};

export type TeamStatusOutcome = {
  status: "found";
  locked: boolean;
  buzzed: boolean;
  isFirst: boolean;
  reactionMs: number | null;
  order: number | null;
  roundId: string | null;
  buzzEvent: BuzzEventRow | null;
  round: RoundRow | null;
} | {
  status: "unknown_team";
  teamId: string;
};

export function getTeamStatus(input: TeamStatusInput): Promise<TeamStatusOutcome> {
  const { sessionId, teamId } = input;

  return db.transaction(async (tx) => {
    const [team] = await tx
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.id, teamId), eq(teams.sessionId, sessionId)))
      .limit(1);

    if (!team) {
      return { status: "unknown_team", teamId } as const;
    }

    const [round] = await tx
      .select()
      .from(rounds)
      .where(and(eq(rounds.sessionId, sessionId), eq(rounds.status, "open")))
      .orderBy(rounds.orderNumber)
      .limit(1);

    const roundId = round?.id ?? null;
    const scope = and(
      eq(buzzEvents.sessionId, sessionId),
      roundId === null ? isNull(buzzEvents.roundId) : eq(buzzEvents.roundId, roundId),
    );

    // Pakai urutan yang sama dengan papan skor moderator (seri ditangani
    // lewat reactionMs + waktu tiba).
    const ranked = rankBuzzes(await tx.select().from(buzzEvents).where(scope));

    const idx = ranked.findIndex((e) => e.teamId === teamId);
    if (idx >= 0) {
      const ev = ranked[idx];
      return {
        status: "found",
        locked: true,
        buzzed: true,
        isFirst: ev.isFirst,
        reactionMs: ev.reactionMs,
        order: idx + 1,
        roundId: ev.roundId,
        buzzEvent: ev,
        round: round ?? null,
      } as const;
    }

    const anyBuzzes = ranked.length > 0;
    return {
      status: "found",
      locked: roundId === null ? false : anyBuzzes,
      buzzed: false,
      isFirst: false,
      reactionMs: null,
      order: null,
      roundId: roundId === null ? null : roundId,
      buzzEvent: null,
      round: round ?? null,
    } as const;
  });
}

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

export function getTeamStatus(input: TeamStatusInput): TeamStatusOutcome {
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
      .where(and(eq(rounds.sessionId, sessionId), eq(rounds.status, "open")))
      .orderBy(rounds.orderNumber)
      .get();

    const roundId = round?.id ?? null;
    const scope = and(
      eq(buzzEvents.sessionId, sessionId),
      roundId === null ? isNull(buzzEvents.roundId) : eq(buzzEvents.roundId, roundId),
    );

    const allBuzzes = tx
      .select()
      .from(buzzEvents)
      .where(scope)
      .orderBy(buzzEvents.createdAt, buzzEvents.id)
      .all();

    const idx = allBuzzes.findIndex((e) => e.teamId === teamId);
    if (idx >= 0) {
      const ev = allBuzzes[idx];
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

    const anyBuzzes = allBuzzes.length > 0;
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

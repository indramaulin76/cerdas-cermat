import "server-only";

import { randomUUID } from "node:crypto";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  buzzEvents,
  rounds,
  sessions,
  teams,
  type BuzzEventRow,
  type RoundRow,
  type TeamRow,
} from "@/db/schema";
import type { QuestionPhase, RoundDto, SessionEvent } from "@/lib/ccl/api";
import { rankBuzzes, toBuzzEventDto } from "@/server/buzz";

export type OpenRoundInput = { sessionId: string };
export type OpenRoundOutcome =
  | { status: "opened"; row: RoundRow }
  | { status: "inactive_session" };

async function findOpenRound(sessionId: string): Promise<RoundRow | undefined> {
  const [round] = await db
    .select()
    .from(rounds)
    .where(and(eq(rounds.sessionId, sessionId), eq(rounds.status, "open")))
    .orderBy(desc(rounds.orderNumber), desc(rounds.createdAt))
    .for("update")
    .limit(1);
  return round;
}

async function getRanking(roundId: string): Promise<BuzzEventRow[]> {
  return rankBuzzes(
    await db.select().from(buzzEvents).where(eq(buzzEvents.roundId, roundId)),
  );
}

function getAvailableRanking(rows: BuzzEventRow[]): BuzzEventRow[] {
  return rows.filter((row) => row.answerStatus === null);
}

function nextAvailableTeam(rows: BuzzEventRow[]): BuzzEventRow | undefined {
  return getAvailableRanking(rows)[0];
}

export function toRoundDto(row: RoundRow): RoundDto {
  return {
    id: row.id,
    sessionId: row.sessionId,
    orderNumber: row.orderNumber,
    status: row.status,
    startedAt: row.startedAt?.toISOString() ?? null,
    answeringTeamId: row.answeringTeamId,
    answerStartedAt: row.answerStartedAt?.toISOString() ?? null,
    awaitingNext: row.awaitingNext,
    endedAt: row.endedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export type RoundStatusOutcome = {
  phase: QuestionPhase;
  round: RoundRow | null;
  ranking: BuzzEventRow[];
  winner: BuzzEventRow | null;
};

export async function getRoundStatus(
  sessionId: string,
): Promise<RoundStatusOutcome> {
  const round = await findOpenRound(sessionId);
  if (!round) return { phase: "idle", round: null, ranking: [], winner: null };

  const ranking = await getRanking(round.id);
  const phase: QuestionPhase = round.answeringTeamId
    ? "answering"
    : round.awaitingNext
      ? "awaiting_next"
      : "open";
  return { phase, round, ranking, winner: ranking[0] ?? null };
}

export async function getRoundStateEvent(
  sessionId: string,
): Promise<Extract<SessionEvent, { type: "round.state" }> | null> {
  const status = await getRoundStatus(sessionId);
  if (!status.round) return null;
  return {
    type: "round.state",
    at: new Date().toISOString(),
    phase: status.phase,
    round: toRoundDto(status.round),
    ranking: status.ranking.map(toBuzzEventDto),
  };
}

export type ResetRoundOutcome = { closed: RoundRow | null };

export function resetRound(sessionId: string): Promise<ResetRoundOutcome> {
  return db.transaction(async (tx) => {
    const [round] = await tx
      .select()
      .from(rounds)
      .where(and(eq(rounds.sessionId, sessionId), eq(rounds.status, "open")))
      .orderBy(desc(rounds.orderNumber), desc(rounds.createdAt))
      .for("update")
      .limit(1);
    if (!round) return { closed: null } as const;

    const now = new Date();
    const [closed] = await tx.update(rounds)
      .set({
        status: "closed",
        answeringTeamId: null,
        answerStartedAt: null,
        awaitingNext: false,
        endedAt: now,
      })
      .where(eq(rounds.id, round.id))
      .returning();
    return { closed } as const;
  });
}

export function openRound(input: OpenRoundInput): Promise<OpenRoundOutcome> {
  return db.transaction(async (tx) => {
    const [session] = await tx
      .select({ status: sessions.status })
      .from(sessions)
      .where(eq(sessions.id, input.sessionId))
      .for("update")
      .limit(1);
    if (!session || session.status !== "active") {
      return { status: "inactive_session" } as const;
    }

    const now = new Date();
    await tx.update(rounds)
      .set({
        status: "closed",
        answeringTeamId: null,
        answerStartedAt: null,
        awaitingNext: false,
        endedAt: now,
      })
      .where(and(eq(rounds.sessionId, input.sessionId), eq(rounds.status, "open")));

    const [lastRound] = await tx
      .select()
      .from(rounds)
      .where(eq(rounds.sessionId, input.sessionId))
      .orderBy(desc(rounds.orderNumber), desc(rounds.createdAt))
      .limit(1);
    const row: RoundRow = {
      id: randomUUID(),
      sessionId: input.sessionId,
      orderNumber: lastRound ? lastRound.orderNumber + 1 : 1,
      status: "open",
      startedAt: now,
      answeringTeamId: null,
      answerStartedAt: null,
      awaitingNext: false,
      endedAt: null,
      createdAt: now,
    };
    const [created] = await tx.insert(rounds).values(row).returning();
    return { status: "opened", row: created } as const;
  });
}

export type SelectTeamOutcome =
  | { status: "selected"; round: RoundRow }
  | { status: "no_open_round" | "team_not_buzzed" | "already_answered" | "answer_in_progress" };

export function selectAnsweringTeam(
  sessionId: string,
  teamId: string,
): Promise<SelectTeamOutcome> {
  return db.transaction(async (tx) => {
    const [round] = await tx
      .select()
      .from(rounds)
      .where(and(eq(rounds.sessionId, sessionId), eq(rounds.status, "open")))
      .orderBy(desc(rounds.orderNumber), desc(rounds.createdAt))
      .for("update")
      .limit(1);
    if (!round) return { status: "no_open_round" } as const;

    const [candidate] = await tx
      .select()
      .from(buzzEvents)
      .where(
        and(
          eq(buzzEvents.roundId, round.id),
          eq(buzzEvents.teamId, teamId),
        ),
      )
      .limit(1);
    if (!candidate) return { status: "team_not_buzzed" } as const;
    if (candidate.answerStatus !== null) return { status: "already_answered" } as const;

    if (round.answeringTeamId === teamId) {
      return { status: "answer_in_progress" } as const;
    }

    const now = new Date();
    if (round.answeringTeamId) {
      await tx.update(buzzEvents)
        .set({ answerStatus: "timeout" })
        .where(
          and(
            eq(buzzEvents.roundId, round.id),
            eq(buzzEvents.teamId, round.answeringTeamId),
          ),
        );
    }

    const [updated] = await tx.update(rounds)
      .set({
        answeringTeamId: teamId,
        answerStartedAt: now,
        awaitingNext: false,
      })
      .where(eq(rounds.id, round.id))
      .returning();
    return { status: "selected", round: updated } as const;
  });
}

type AdvanceOutcome =
  | { status: "advanced"; round: RoundRow; team: BuzzEventRow }
  | { status: "waiting"; round: RoundRow }
  | { status: "no_open_round" | "not_waiting" | "no_candidate" };

export function advanceToNextTeam(sessionId: string): Promise<AdvanceOutcome> {
  return db.transaction(async (tx) => {
    const [round] = await tx
      .select()
      .from(rounds)
      .where(and(eq(rounds.sessionId, sessionId), eq(rounds.status, "open")))
      .orderBy(desc(rounds.orderNumber), desc(rounds.createdAt))
      .for("update")
      .limit(1);
    if (!round) return { status: "no_open_round" } as const;
    if (!round.awaitingNext) return { status: "not_waiting" } as const;

    const ranking = rankBuzzes(
      await tx.select().from(buzzEvents).where(eq(buzzEvents.roundId, round.id)),
    );
    const candidate = nextAvailableTeam(ranking);
    if (!candidate) return { status: "no_candidate" } as const;

    const now = new Date();
    const [updated] = await tx.update(rounds)
      .set({
        answeringTeamId: candidate.teamId,
        answerStartedAt: now,
        awaitingNext: false,
      })
      .where(eq(rounds.id, round.id))
      .returning();
    return {
      status: "advanced",
      team: candidate,
      round: updated,
    } as const;
  });
}

export type AnswerOutcome =
  | { status: "recorded"; round: RoundRow; team: TeamRow; delta: number }
  | { status: "no_open_round" | "no_answering_team" | "invalid_penalty" | "unknown_team" };

export async function recordAnswerResult(
  sessionId: string,
  result: "correct" | "wrong",
  penalty?: number,
): Promise<AnswerOutcome> {
  if (result === "wrong" && ![50, 75, 100].includes(penalty ?? 0)) {
    return { status: "invalid_penalty" };
  }

  return db.transaction(async (tx) => {
    const [round] = await tx
      .select()
      .from(rounds)
      .where(and(eq(rounds.sessionId, sessionId), eq(rounds.status, "open")))
      .orderBy(desc(rounds.orderNumber), desc(rounds.createdAt))
      .for("update")
      .limit(1);
    if (!round) return { status: "no_open_round" } as const;
    if (!round.answeringTeamId || !round.answerStartedAt) {
      return { status: "no_answering_team" } as const;
    }

    const [buzz] = await tx
      .select()
      .from(buzzEvents)
      .where(
        and(
          eq(buzzEvents.roundId, round.id),
          eq(buzzEvents.teamId, round.answeringTeamId),
        ),
      )
      .limit(1);
    const [team] = await tx
      .select()
      .from(teams)
      .where(and(eq(teams.id, round.answeringTeamId), eq(teams.sessionId, sessionId)))
      .limit(1);
    if (!buzz || !team || buzz.answerStatus !== null) {
      return { status: "no_answering_team" } as const;
    }

    const delta = result === "correct" ? 100 : -(penalty ?? 0);
    const now = new Date();
    const updatedTeam = { ...team, score: team.score + delta };
    const [savedTeam] = await tx
      .update(teams)
      .set({ score: updatedTeam.score })
      .where(eq(teams.id, team.id))
      .returning();
    await tx.update(buzzEvents)
      .set({ answerStatus: result })
      .where(eq(buzzEvents.id, buzz.id));

    const updatedRound: RoundRow =
      result === "correct"
        ? {
            ...round,
            status: "closed",
            answeringTeamId: null,
            answerStartedAt: null,
            awaitingNext: false,
            endedAt: now,
          }
        : {
            ...round,
            answeringTeamId: null,
            answerStartedAt: null,
            awaitingNext: true,
          };
    const [savedRound] = await tx.update(rounds)
      .set({
        status: updatedRound.status,
        answeringTeamId: updatedRound.answeringTeamId,
        answerStartedAt: updatedRound.answerStartedAt,
        awaitingNext: updatedRound.awaitingNext,
        endedAt: updatedRound.endedAt,
      })
      .where(eq(rounds.id, round.id))
      .returning();
    return {
      status: "recorded",
      round: savedRound,
      team: savedTeam,
      delta,
    } as const;
  });
}

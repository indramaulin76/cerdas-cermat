import "server-only";

import { randomUUID } from "node:crypto";

import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { buzzEvents, rounds, type RoundRow } from "@/db/schema";
import type { RoundDto } from "@/lib/ccl/api";

export type OpenRoundInput = {
  sessionId: string;
};

export type OpenRoundOutcome = {
  status: "opened";
  row: RoundRow;
};

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

export function openRound(input: OpenRoundInput): OpenRoundOutcome {
  const { sessionId } = input;

  return db.transaction((tx) => {
    const lastRound = tx
      .select()
      .from(rounds)
      .where(eq(rounds.sessionId, sessionId))
      .orderBy(desc(rounds.orderNumber), desc(rounds.createdAt))
      .get();

    const orderNumber = lastRound ? lastRound.orderNumber + 1 : 1;
    const now = new Date();

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

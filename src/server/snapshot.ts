/**
 * Cuplikan keadaan sesi untuk kanal realtime.
 *
 * Dipakai saat klien (regu/penonton/moderator) baru tersambung ke aliran SSE,
 * supaya mereka langsung punya gambaran lengkap: fase soal, urutan jawab,
 * skor semua regu, dan pengaturan waktu — tanpa menunggu peristiwa berikutnya.
 */

import "server-only";

import type { SessionEvent } from "@/lib/ccl/api";
import { toBuzzEventDto } from "@/server/buzz";
import { getRoundStatus, toRoundDto } from "@/server/round";
import { getSession, toSessionDto } from "@/server/session";
import { listTeams, toTeamDto } from "@/server/team";

type SnapshotEvent = Extract<SessionEvent, { type: "state.snapshot" }>;

/** Rakit cuplikan keadaan terkini sebuah sesi, atau `null` bila sesi tak ada. */
export function getSessionSnapshot(sessionId: string): SnapshotEvent | null {
  const session = getSession(sessionId);
  if (!session) return null;

  const status = getRoundStatus(sessionId);

  return {
    type: "state.snapshot",
    at: new Date().toISOString(),
    session: toSessionDto(session),
    phase: status.phase,
    round: status.round ? toRoundDto(status.round) : null,
    ranking: status.ranking.map(toBuzzEventDto),
    cooldownSeconds: session.cooldownSeconds,
    serverTime: new Date().toISOString(),
    teams: listTeams(sessionId).map(toTeamDto),
  };
}

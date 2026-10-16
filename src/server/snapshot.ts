/**
 * Cuplikan keadaan sesi untuk kanal realtime.
 *
 * Dipakai saat klien (regu/penonton/moderator) baru tersambung ke Ably,
 * supaya mereka langsung punya gambaran lengkap: fase soal, urutan jawab,
 * skor semua regu, dan pengaturan waktu — tanpa menunggu peristiwa berikutnya.
 */

import "server-only";

import type { SessionEvent } from "@/lib/ccl/api";
import { toBuzzEventDto, toHighlightDto } from "@/server/buzz";
import { getRoundStatus, toRoundDto } from "@/server/round";
import { getSession, toSessionDto } from "@/server/session";
import { listTeams, toTeamDto } from "@/server/team";

type SnapshotEvent = Extract<SessionEvent, { type: "state.snapshot" }>;

/** Rakit cuplikan keadaan terkini sebuah sesi, atau `null` bila sesi tak ada. */
export async function getSessionSnapshot(sessionId: string): Promise<SnapshotEvent | null> {
  const session = await getSession(sessionId);
  if (!session) return null;

  const [status, teams] = await Promise.all([
    getRoundStatus(sessionId),
    listTeams(sessionId),
  ]);

  return {
    type: "state.snapshot",
    at: new Date().toISOString(),
    session: toSessionDto(session),
    phase: status.phase,
    round: status.round ? toRoundDto(status.round) : null,
    ranking: status.ranking.map(toBuzzEventDto),
    highlight: toHighlightDto(status.winner),
    cooldownSeconds: session.cooldownSeconds,
    serverTime: new Date().toISOString(),
    teams: teams.map(toTeamDto),
  };
}

"use client";

import { useEffect, useState } from "react";

import {
  eventsPath,
  roleAuthPath,
  type BuzzEventDto,
  type RoundDto,
  type SessionDto,
  type SessionEvent,
  type TeamDto,
} from "@/lib/ccl/api";
import type { RoleId } from "@/lib/ccl/roles";

export type LiveSessionState = {
  session: SessionDto | null;
  teams: TeamDto[];
  phase: "idle" | "open" | "answering" | "awaiting_next";
  round: RoundDto | null;
  ranking: BuzzEventDto[];
  highlightTeamId: string | null;
  armAt: number | null;
  connected: boolean;
  error: string | null;
};

const EMPTY: LiveSessionState = {
  session: null,
  teams: [],
  phase: "idle",
  round: null,
  ranking: [],
  highlightTeamId: null,
  armAt: null,
  connected: false,
  error: null,
};

function parseEvent(message: MessageEvent<string>): SessionEvent | null {
  try {
    return JSON.parse(message.data) as SessionEvent;
  } catch {
    return null;
  }
}

export function useLiveSession(sessionId: string, role: RoleId) {
  const [state, setState] = useState<LiveSessionState>(EMPTY);

  useEffect(() => {
    if (!sessionId) return;

    let active = true;
    let source: EventSource | null = null;
    const controller = new AbortController();
    const authCheck = fetch(roleAuthPath(sessionId, role), {
      credentials: "same-origin",
      signal: controller.signal,
    }).then(async (response) => {
      const result = (await response.json()) as {
        authenticated?: boolean;
        message?: string;
      };
      if (!response.ok || result.authenticated !== true) {
        throw new Error(result.message ?? "Akses sesi sudah berakhir. Masuk kembali.");
      }
    });

    authCheck
      .then(() => {
        if (!active) return;
        const path =
          role === "viewer"
            ? `/api/sessions/${encodeURIComponent(sessionId)}/viewer/events`
            : eventsPath(sessionId);
        const stream = new EventSource(path);
        source = stream;
        const eventNames = [
          "state.snapshot",
          "round.opened",
          "round.state",
          "round.reset",
          "buzz.recorded",
          "highlight.updated",
          "score.updated",
          "teams.updated",
          "session.updated",
        ] as const;

        const onEvent = (message: Event) => {
          const event = parseEvent(message as MessageEvent<string>);
          if (!event) {
            setState((current) => ({
              ...current,
              error: "Respons real-time tidak dapat dibaca.",
            }));
            return;
          }
          setState((current) => {
            switch (event.type) {
              case "state.snapshot":
                return {
                  ...current,
                  session: event.session,
                  teams: event.teams,
                  phase: event.phase,
                  round: event.round,
                  ranking: event.ranking,
                  highlightTeamId: event.highlight.teamId,
                  armAt: event.round?.startedAt
                    ? Date.parse(event.round.startedAt)
                    : null,
                  error: null,
                };
              case "round.opened":
                return {
                  ...current,
                  phase: "open",
                  round: event.round,
                  ranking: [],
                  highlightTeamId: null,
                  armAt: Date.parse(event.armAt),
                  session: current.session
                    ? {
                        ...current.session,
                        cooldownSeconds: event.cooldownSeconds,
                      }
                    : current.session,
                };
              case "round.state":
                return {
                  ...current,
                  phase: event.phase,
                  round: event.round,
                  ranking: event.ranking,
                  highlightTeamId: event.ranking[0]?.teamId ?? null,
                  armAt: event.round.startedAt
                    ? Date.parse(event.round.startedAt)
                    : null,
                };
              case "round.reset":
                return {
                  ...current,
                  phase: "idle",
                  round: null,
                  ranking: [],
                  highlightTeamId: null,
                  armAt: null,
                };
              case "buzz.recorded":
                if (
                  current.phase !== "open" ||
                  current.round?.id !== event.event.roundId
                ) {
                  return current;
                }
                return {
                  ...current,
                  ranking: event.ranking,
                  highlightTeamId: event.ranking[0]?.teamId ?? null,
                };
              case "highlight.updated":
                if (
                  event.highlight.event &&
                  current.round?.id !== event.highlight.event.roundId
                ) {
                  return current;
                }
                return {
                  ...current,
                  highlightTeamId: event.highlight.teamId,
                };
              case "score.updated":
                return {
                  ...current,
                  teams: current.teams.map((team) =>
                    team.id === event.team.id ? event.team : team,
                  ),
                };
              case "teams.updated":
                return { ...current, teams: event.teams };
              case "session.updated":
                return { ...current, session: event.session };
              case "ping":
                return current;
            }
          });
        };

        for (const eventName of eventNames) {
          stream.addEventListener(eventName, onEvent);
        }
        stream.onopen = () =>
          setState((current) => ({ ...current, connected: true, error: null }));
        stream.onerror = () =>
          setState((current) => ({
            ...current,
            connected: false,
            error: "Koneksi real-time terputus. Mencoba menyambungkan kembali…",
          }));

      })
      .catch((reason: unknown) => {
        if (active && !controller.signal.aborted) {
          setState((current) => ({
            ...current,
            error:
              reason instanceof Error
                ? reason.message
                : "Gagal membuka koneksi real-time.",
          }));
        }
      });

    return () => {
      active = false;
      controller.abort();
      source?.close();
    };
  }, [role, sessionId]);

  return state;
}

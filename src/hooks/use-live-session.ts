"use client";

import { ErrorInfo, Realtime, type TokenRequest } from "ably";
import { useEffect, useState } from "react";

import {
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

const EVENT_TYPES = new Set<SessionEvent["type"]>([
  "state.snapshot",
  "round.opened",
  "round.state",
  "round.reset",
  "buzz.recorded",
  "highlight.updated",
  "score.updated",
  "teams.updated",
  "session.updated",
  "ping",
]);

function parseEvent(data: unknown): SessionEvent | null {
  try {
    const value =
      typeof data === "string" ? (JSON.parse(data) as unknown) : data;
    if (
      typeof value === "object" &&
      value !== null &&
      "type" in value &&
      typeof value.type === "string" &&
      EVENT_TYPES.has(value.type as SessionEvent["type"])
    ) {
      return value as SessionEvent;
    }
  } catch {
    return null;
  }
  return null;
}

function isTokenRequest(value: unknown): value is TokenRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    "capability" in value &&
    typeof value.capability === "string" &&
    "keyName" in value &&
    typeof value.keyName === "string" &&
    "mac" in value &&
    typeof value.mac === "string" &&
    "nonce" in value &&
    typeof value.nonce === "string" &&
    "timestamp" in value &&
    typeof value.timestamp === "number"
  );
}

function applyEvent(
  current: LiveSessionState,
  event: SessionEvent,
): LiveSessionState {
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
          ? { ...current.session, cooldownSeconds: event.cooldownSeconds }
          : current.session,
      };
    case "round.state":
      return {
        ...current,
        phase: event.phase,
        round: event.round,
        ranking: event.ranking,
        highlightTeamId: event.ranking[0]?.teamId ?? null,
        armAt: event.round.startedAt ? Date.parse(event.round.startedAt) : null,
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
      return { ...current, highlightTeamId: event.highlight.teamId };
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
}

function audienceForRole(role: RoleId): "live" | "viewer" {
  return role === "viewer" ? "viewer" : "live";
}

function apiPath(sessionId: string, endpoint: string, audience: string): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}/${endpoint}?audience=${audience}`;
}

export function useLiveSession(sessionId: string, role: RoleId) {
  const [state, setState] = useState<LiveSessionState>(EMPTY);

  useEffect(() => {
    if (!sessionId) return;

    let active = true;
    const controller = new AbortController();
    const audience = audienceForRole(role);
    const tokenPath = apiPath(sessionId, "realtime-token", audience);
    const fetchTokenRequest = async (): Promise<TokenRequest> => {
      const response = await fetch(tokenPath, {
        credentials: "same-origin",
        signal: controller.signal,
      });
      const result = (await response.json()) as {
        ok?: boolean;
        tokenRequest?: unknown;
        message?: string;
      };
      if (!response.ok || !isTokenRequest(result.tokenRequest)) {
        throw new Error(result.message ?? "Tidak dapat mengautentikasi realtime.");
      }
      return result.tokenRequest;
    };

    const realtime = new Realtime({
      authCallback: async (_tokenParams, callback) => {
        try {
          callback(null, await fetchTokenRequest());
        } catch (reason) {
          const message =
            reason instanceof Error
              ? reason.message
              : "Gagal mendapatkan token realtime.";
          callback(new ErrorInfo(message, 50000, 500), null);
        }
      },
    });
    const channel = realtime.channels.get(`ccl-${sessionId}-${audience}`);
    let syncing = true;
    let eventsWhileSyncing: SessionEvent[] = [];

    const onMessage = (message: { data?: unknown }) => {
      const event = parseEvent(message.data);
      if (!event) {
        setState((current) => ({
          ...current,
          error: "Respons real-time tidak dapat dibaca.",
        }));
        return;
      }
      if (syncing) {
        eventsWhileSyncing.push(event);
        return;
      }
      setState((current) => applyEvent(current, event));
    };

    realtime.connection.on("connected", () => {
      if (active) {
        setState((current) => ({ ...current, connected: true, error: null }));
      }
    });
    realtime.connection.on("disconnected", () => {
      if (active) {
        setState((current) => ({
          ...current,
          connected: false,
          error: "Koneksi real-time terputus. Mencoba menyambungkan kembali…",
        }));
      }
    });
    realtime.connection.on("failed", (change) => {
      if (active) {
        setState((current) => ({
          ...current,
          connected: false,
          error: change.reason?.message ?? "Gagal membuka koneksi real-time.",
        }));
      }
    });

    channel
      .subscribe("session.event", onMessage)
      .then(async () => {
        if (!active) return;
        const response = await fetch(
          apiPath(sessionId, "realtime-state", audience),
          { credentials: "same-origin", signal: controller.signal },
        );
        const result = (await response.json()) as {
          ok?: boolean;
          snapshot?: unknown;
          message?: string;
        };
        if (!response.ok || !result.snapshot) {
          throw new Error(result.message ?? "Tidak dapat memuat keadaan sesi.");
        }
        const snapshot = parseEvent(result.snapshot);
        if (!snapshot || snapshot.type !== "state.snapshot") {
          throw new Error("Keadaan sesi realtime tidak valid.");
        }
        const pendingEvents = eventsWhileSyncing;
        eventsWhileSyncing = [];
        syncing = false;
        if (active) {
          setState((current) =>
            pendingEvents.reduce(
              (next, event) => applyEvent(next, event),
              applyEvent(current, snapshot),
            ),
          );
        }
      })
      .catch((reason: unknown) => {
        if (active && !controller.signal.aborted) {
          setState((current) => ({
            ...current,
            connected: false,
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
      realtime.close();
    };
  }, [role, sessionId]);

  return state;
}

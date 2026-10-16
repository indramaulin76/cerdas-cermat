/**
 * Publishes live session events through Ably so every serverless instance
 * reaches the same subscribers.
 */

import "server-only";

import { Rest } from "ably";

import type { SessionEvent } from "@/lib/ccl/api";

type Audience = "live" | "viewer";

function getAblyClient(): Rest {
  const key = process.env.ABLY_API_KEY;
  if (!key) {
    throw new Error("ABLY_API_KEY wajib diatur untuk realtime.");
  }

  const globalForAbly = globalThis as typeof globalThis & {
    __cclAblyRest?: Rest;
  };
  globalForAbly.__cclAblyRest ??= new Rest({ key });
  return globalForAbly.__cclAblyRest;
}

export function sessionChannelName(
  sessionId: string,
  audience: Audience,
): string {
  return `ccl-${sessionId}-${audience}`;
}

/** Mint a least-privilege Ably token for one session audience. */
export async function createSessionTokenRequest(
  sessionId: string,
  audience: Audience,
) {
  const channel = sessionChannelName(sessionId, audience);
  return getAblyClient().auth.createTokenRequest({
    capability: { [channel]: ["subscribe"] },
    ttl: 60 * 60 * 1000,
  });
}

/** Publish each event to live clients and the viewer-only audience. */
export async function publish(
  sessionId: string,
  event: SessionEvent,
): Promise<void> {
  const client = getAblyClient();
  await Promise.all(
    (["live", "viewer"] as const).map((audience) =>
      client.channels
        .get(sessionChannelName(sessionId, audience))
        .publish("session.event", event),
    ),
  );
}

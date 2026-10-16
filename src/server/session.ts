/**
 * Logika server untuk sesi lomba dan pengaturannya.
 *
 * Moderator mengatur jendela waktu jawab (`cooldown_seconds`) dan poin dari satu
 * layar. Nilai-nilai ini dipakai aba-aba regu dan perhitungan skor, lalu
 * disiarkan agar semua klien ikut sinkron.
 */

import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { sessions, type SessionRow } from "@/db/schema";
import type { SessionDto } from "@/lib/ccl/api";

/** Ubah baris sesi menjadi DTO untuk dikirim ke klien. */
export function toSessionDto(row: SessionRow): SessionDto {
  return {
    id: row.id,
    title: row.title,
    cooldownSeconds: row.cooldownSeconds,
    correctPoints: row.correctPoints,
    wrongPoints: row.wrongPoints,
    status: row.status as "draft" | "active" | "finished",
  };
}

/** Ambil satu sesi, atau `undefined` bila tak ada. */
export function getSession(sessionId: string): SessionRow | undefined {
  return db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
}

/** Masukan pengaturan sesi. */
export type UpdateSettingsInput = {
  sessionId: string;
  cooldownSeconds?: number;
  correctPoints?: number;
  wrongPoints?: number;
};

/** Hasil pengaturan sesi. */
export type UpdateSettingsOutcome =
  | { status: "updated"; row: SessionRow }
  | { status: "unknown_session"; sessionId: string }
  | { status: "invalid" };

/**
 * Ubah pengaturan sesi.
 *
 * Hanya bidang yang diberikan yang diubah. Batas wajar: cooldown 1..600 detik,
 * poin dalam rentang -1000..1000, supaya tidak ada nilai aneh yang merusak
 * jalannya lomba.
 */
export function updateSessionSettings(
  input: UpdateSettingsInput,
): UpdateSettingsOutcome {
  const { sessionId } = input;

  const patch: Partial<
    Pick<SessionRow, "cooldownSeconds" | "correctPoints" | "wrongPoints">
  > = {};

  if (input.cooldownSeconds !== undefined) {
    if (
      !Number.isFinite(input.cooldownSeconds) ||
      input.cooldownSeconds < 1 ||
      input.cooldownSeconds > 600
    ) {
      return { status: "invalid" } as const;
    }
    patch.cooldownSeconds = Math.round(input.cooldownSeconds);
  }

  if (input.correctPoints !== undefined) {
    if (
      !Number.isFinite(input.correctPoints) ||
      Math.abs(input.correctPoints) > 1000
    ) {
      return { status: "invalid" } as const;
    }
    patch.correctPoints = Math.round(input.correctPoints);
  }

  if (input.wrongPoints !== undefined) {
    if (
      !Number.isFinite(input.wrongPoints) ||
      Math.abs(input.wrongPoints) > 1000
    ) {
      return { status: "invalid" } as const;
    }
    patch.wrongPoints = Math.round(input.wrongPoints);
  }

  if (Object.keys(patch).length === 0) {
    return { status: "invalid" } as const;
  }

  return db.transaction((tx) => {
    const row = tx
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!row) {
      return { status: "unknown_session", sessionId } as const;
    }

    const now = new Date();
    tx.update(sessions)
      .set({ ...patch, updatedAt: now })
      .where(eq(sessions.id, sessionId))
      .run();

    return { status: "updated", row: { ...row, ...patch, updatedAt: now } } as const;
  });
}

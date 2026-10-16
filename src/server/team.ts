/** Logika server untuk pengelolaan regu. */

import "server-only";

import { randomUUID } from "node:crypto";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  buzzEvents,
  rounds,
  sessions,
  teams,
  type NewTeamRow,
  type TeamRow,
} from "@/db/schema";
import type { SessionEvent, TeamDto } from "@/lib/ccl/api";
import { nextTeamColor } from "@/lib/ccl/team-colors";

/** Batas maksimal regu per sesi (sesuai PRD). */
export const MAX_TEAMS = 10;

/** Panjang maksimal nama regu. */
export const MAX_TEAM_NAME_LENGTH = 60;

/** Ubah baris regu menjadi DTO untuk dikirim ke klien. */
export function toTeamDto(row: TeamRow): TeamDto {
  return {
    id: row.id,
    sessionId: row.sessionId,
    name: row.name,
    color: row.color,
    score: row.score,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Daftar regu sebuah sesi, diurutkan sesuai waktu dibuat. */
export async function listTeams(sessionId: string): Promise<TeamRow[]> {
  return db
    .select()
    .from(teams)
    .where(eq(teams.sessionId, sessionId))
    .orderBy(asc(teams.createdAt), asc(teams.id));
}

type TeamsUpdatedEvent = Extract<SessionEvent, { type: "teams.updated" }>;

/**
 * Rakit peristiwa `teams.updated` dari daftar regu terkini.
 *
 * Dipakai route tambah/ubah/hapus regu agar dashboard moderator, layar
 * penonton, dan HP regu menerima daftar terbaru tanpa memuat ulang.
 */
export async function toTeamsUpdatedEvent(
  sessionId: string,
  action: TeamsUpdatedEvent["action"],
): Promise<TeamsUpdatedEvent> {
  return {
    type: "teams.updated",
    at: new Date().toISOString(),
    action,
    teams: (await listTeams(sessionId)).map(toTeamDto),
  };
}

/** Ubah nama regu menjadi id yang aman untuk URL. */
function slugifyTeamName(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return slug || "regu";
}

/** Pastikan id regu unik secara global (id regu adalah kunci utama). */
async function uniqueTeamId(name: string): Promise<string> {
  const base = slugifyTeamName(name);
  const taken = async (id: string) =>
    (await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.id, id))
      .limit(1)).length > 0;

  if (!(await taken(base))) return base;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${base}-${randomUUID().slice(0, 6)}`;
    if (!(await taken(candidate))) return candidate;
  }
  return randomUUID();
}

/** Perluas hex pendek (#abc) menjadi enam digit (#aabbcc). */
function normalizeHexColor(hex: string): string {
  if (hex.length === 4) {
    const [, r, g, b] = hex;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return hex;
}

/**
 * Validasi nama regu.
 *
 * Nama dirapikan (spasi ganda disatukan) lalu diperiksa tidak kosong dan tidak
 * melebihi `MAX_TEAM_NAME_LENGTH`.
 */
function checkTeamName(raw: string): {
  ok: true;
  name: string;
} | {
  ok: false;
  reason: "empty" | "too_long";
} {
  const name = raw.trim().replace(/\s+/g, " ");

  if (name === "") return { ok: false, reason: "empty" } as const;
  if (name.length > MAX_TEAM_NAME_LENGTH) {
    return { ok: false, reason: "too_long" } as const;
  }
  return { ok: true, name } as const;
}

/** Validasi warna hex; kembalikan nilai ternormalisasi, atau `null` bila salah. */
function parseHexColor(raw: string): string | null {
  const normalized = raw.trim().toLowerCase();
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(normalized)) return null;
  return normalizeHexColor(normalized);
}

/** Masukan pembuatan regu. */
export type CreateTeamInput = {
  sessionId: string;
  name: string;
  /** Warna identitas opsional (hex). Bila kosong, dipilih otomatis. */
  color?: string | null;
};

/** Hasil pembuatan regu. */
export type CreateTeamOutcome =
  | { status: "created"; row: TeamRow }
  | { status: "unknown_session"; sessionId: string }
  | { status: "invalid_name"; reason: "empty" | "too_long" }
  | { status: "duplicate_name"; name: string }
  | { status: "limit_reached"; max: number }
  | { status: "invalid_color" };

/**
 * Tambah regu baru ke sebuah sesi.
 *
 * Aturan yang ditegakkan server:
 * - Sesi harus ada.
 * - Nama wajib diisi, tidak mengandung hanya spasi, dan tidak melebihi batas.
 * - Nama tidak boleh sama dengan regu lain pada sesi yang sama (abaikan
 *   besar/kecil huruf).
 * - Jumlah regu dibatasi `MAX_TEAMS`.
 * - Bila warna tidak diberikan, dipilih dari palet yang belum terpakai.
 */
export async function createTeam(input: CreateTeamInput): Promise<CreateTeamOutcome> {
  const checked = checkTeamName(input.name);
  if (!checked.ok) {
    return { status: "invalid_name", reason: checked.reason } as const;
  }
  const name = checked.name;

  let color: string | null = null;
  if (input.color !== undefined && input.color !== null && input.color !== "") {
    const parsed = parseHexColor(input.color);
    if (parsed === null) {
      return { status: "invalid_color" } as const;
    }
    color = parsed;
  }

  return db.transaction(async (tx) => {
    const [session] = await tx
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.id, input.sessionId))
      .for("update")
      .limit(1);

    if (!session) {
      return { status: "unknown_session", sessionId: input.sessionId } as const;
    }

    const existing = await tx
      .select()
      .from(teams)
      .where(eq(teams.sessionId, input.sessionId));

    if (existing.length >= MAX_TEAMS) {
      return { status: "limit_reached", max: MAX_TEAMS } as const;
    }

    const lowered = name.toLowerCase();
    if (existing.some((team) => team.name.trim().toLowerCase() === lowered)) {
      return { status: "duplicate_name", name } as const;
    }

    const chosenColor = color ?? nextTeamColor(existing.map((t) => t.color));
    const now = new Date();

    const row: NewTeamRow = {
      id: await uniqueTeamId(name),
      sessionId: input.sessionId,
      name,
      color: chosenColor,
      score: 0,
      createdAt: now,
    };

    const [created] = await tx.insert(teams).values(row).returning();

    return { status: "created", row: created } as const;
  });
}

/** Masukan pembaruan identitas regu (nama &/atau warna). */
export type UpdateTeamInput = {
  sessionId: string;
  teamId: string;
  /** Nama baru (opsional). */
  name?: string | null;
  /** Warna baru, hex (opsional). */
  color?: string | null;
};

/** Hasil pembaruan identitas regu. */
export type UpdateTeamOutcome =
  | { status: "updated"; row: TeamRow }
  | { status: "unknown_team"; teamId: string }
  | { status: "invalid" }
  | { status: "invalid_name"; reason: "empty" | "too_long" }
  | { status: "duplicate_name"; name: string }
  | { status: "invalid_color" };

/**
 * Ubah nama dan/atau warna sebuah regu.
 *
 * Aturan:
 * - Regu harus ada pada sesi yang diberikan.
 * - Minimal satu bidang (`name`/`color`) harus diberikan.
 * - Nama mengikuti aturan yang sama seperti pembuatan (wajib terisi & unik per
 *   sesi, abaikan huruf besar/kecil, kecuali nama regu itu sendiri).
 * - Warna harus hex yang valid.
 * - Skor tidak disentuh oleh fungsi ini.
 */
export async function updateTeam(input: UpdateTeamInput): Promise<UpdateTeamOutcome> {
  const providedName = input.name !== undefined && input.name !== null;
  const providedColor =
    input.color !== undefined && input.color !== null && input.color !== "";

  if (!providedName && !providedColor) {
    return { status: "invalid" } as const;
  }

  let name: string | null = null;
  if (providedName) {
    const checked = checkTeamName(input.name as string);
    if (!checked.ok) {
      return { status: "invalid_name", reason: checked.reason } as const;
    }
    name = checked.name;
  }

  let color: string | null = null;
  if (providedColor) {
    const parsed = parseHexColor(input.color as string);
    if (parsed === null) {
      return { status: "invalid_color" } as const;
    }
    color = parsed;
  }

  return db.transaction(async (tx) => {
    const [session] = await tx
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.id, input.sessionId))
      .for("update")
      .limit(1);
    if (!session) {
      return { status: "unknown_team", teamId: input.teamId } as const;
    }

    const [team] = await tx
      .select()
      .from(teams)
      .where(
        and(eq(teams.id, input.teamId), eq(teams.sessionId, input.sessionId)),
      )
      .limit(1);

    if (!team) {
      return { status: "unknown_team", teamId: input.teamId } as const;
    }

    const patch: Partial<Pick<TeamRow, "name" | "color">> = {};

    if (name !== null && name !== team.name) {
      const others = (await tx
        .select()
        .from(teams)
        .where(eq(teams.sessionId, input.sessionId))
        ).filter((t) => t.id !== team.id);

      const lowered = name.toLowerCase();
      if (others.some((t) => t.name.trim().toLowerCase() === lowered)) {
        return { status: "duplicate_name", name } as const;
      }
      patch.name = name;
    }

    if (color !== null && color !== team.color) {
      patch.color = color;
    }

    // Tidak ada yang berubah (mis. nama dikirim sama dengan nama lama).
    if (Object.keys(patch).length === 0) {
      return { status: "updated", row: team } as const;
    }

    const [updated] = await tx
      .update(teams)
      .set(patch)
      .where(eq(teams.id, input.teamId))
      .returning();

    return {
      status: "updated",
      row: updated,
    } as const;
  });
}

/** Masukan penghapusan regu. */
export type RemoveTeamInput = {
  sessionId: string;
  teamId: string;
};

/** Hasil penghapusan regu. */
export type RemoveTeamOutcome =
  | { status: "deleted"; row: TeamRow }
  | { status: "unknown_team"; teamId: string }
  | { status: "team_active"; roundId: string };

/**
 * Hapus sebuah regu dari sesi.
 *
 * Validasi:
 * - Regu harus ada pada sesi ini (jika tidak → `unknown_team`).
 * - Regu yang sedang ikut pada soal/ronde yang masih terbuka tidak boleh
 *   dihapus (`team_active`), supaya urutan jawab dan sorotan regu tercepat
 *   yang sudah disiarkan tidak menunjuk ke regu yang hilang. Kosongkan/ulangi
 *   ronde dulu, lalu hapus.
 *
 * Menghapus regu ikut menghapus catatan tekanan miliknya (lewat foreign key
 * cascade) tanpa mengganggu regu lain.
 */
export function removeTeam(input: RemoveTeamInput): Promise<RemoveTeamOutcome> {
  return db.transaction(async (tx) => {
    const [team] = await tx
      .select()
      .from(teams)
      .where(
        and(eq(teams.id, input.teamId), eq(teams.sessionId, input.sessionId)),
      )
      .limit(1);

    if (!team) {
      return { status: "unknown_team", teamId: input.teamId } as const;
    }

    const [openRound] = await tx
      .select({ id: rounds.id })
      .from(rounds)
      .where(
        and(
          eq(rounds.sessionId, input.sessionId),
          eq(rounds.status, "open"),
        ),
      )
      .for("update")
      .limit(1);

    if (openRound) {
      const [activeBuzz] = await tx
        .select({ id: buzzEvents.id })
        .from(buzzEvents)
        .where(
          and(
            eq(buzzEvents.roundId, openRound.id),
            eq(buzzEvents.teamId, input.teamId),
          ),
        )
        .limit(1);

      if (activeBuzz) {
        return { status: "team_active", roundId: openRound.id } as const;
      }
    }

    await tx.delete(teams).where(eq(teams.id, input.teamId));

    return { status: "deleted", row: team } as const;
  });
}

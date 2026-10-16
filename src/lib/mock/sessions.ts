/**
 * Data tiruan (mock) untuk halaman Sesi & Link.
 *
 * Dipakai admin untuk melihat daftar sesi lomba sebelum layer backend
 * menyediakan penyimpanan sungguhan. Bentuk tipe `SessionSummary` sengaja
 * dibuat sama dengan kontrak API yang menyusul.
 */

import type { SessionSummary } from "@/lib/ccl/types";

/** Peran yang butuh akses ke sebuah sesi. */
export type SessionRole = "moderator" | "viewer" | "team";

/** Urutan tampilan peran di halaman detail. */
export const SESSION_ROLES: SessionRole[] = ["moderator", "viewer", "team"];

/** Informasi statis tiap peran (label, deskripsi, halaman tujuan). */
const ROLE_META: Record<
  SessionRole,
  { label: string; description: string; basePath: string }
> = {
  moderator: {
    label: "Moderator",
    description: "Dashboard untuk memandu jalannya lomba.",
    basePath: "/moderator",
  },
  viewer: {
    label: "Layar Penonton",
    description: "Papan skor besar untuk ditampilkan ke penonton.",
    basePath: "/penonton",
  },
  team: {
    label: "HP Regu",
    description: "Tombol jawab untuk tiap regu peserta.",
    basePath: "/regu",
  },
};

/** Satu link akses peran beserta PIN-nya. */
export type RoleLink = {
  role: SessionRole;
  /** Label peran untuk tampilan. */
  label: string;
  /** Deskripsi singkat peran. */
  description: string;
  /** Path halaman peran (relatif), sudah membawa id sesi. */
  path: string;
  /** PIN masuk untuk peran ini. */
  pin: string;
};

/** Detail satu sesi: ringkasan + link tiap peran. */
export type SessionDetail = {
  session: SessionSummary;
  roles: RoleLink[];
};

/**
 * PIN peran yang stabil untuk sebuah sesi (deterministik).
 *
 * Nilai sama selalu dihasilkan untuk pasangan sesi+peran yang sama, sehingga
 * "link dan PIN tetap sama" saat admin membuka ulang detail. Backend nanti
 * menyimpan PIN sungguhan di basis data.
 */
function pinFor(sessionId: string, role: SessionRole): string {
  const input = `${sessionId}:${role}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const value = 1000 + (Math.abs(hash) % 9000);
  return String(value);
}

/** Rakit detail sesi (link + PIN tiap peran) dari sebuah ringkasan sesi. */
export function buildMockSessionDetail(session: SessionSummary): SessionDetail {
  return {
    session,
    roles: SESSION_ROLES.map((role) => ({
      role,
      label: ROLE_META[role].label,
      description: ROLE_META[role].description,
      path: `${ROLE_META[role].basePath}?session=${encodeURIComponent(
        session.id,
      )}`,
      pin: pinFor(session.id, role),
    })),
  };
}

/** Detail sesi tiruan berdasarkan id, atau `null` bila tidak ada. */
export function getMockSessionDetail(sessionId: string): SessionDetail | null {
  const session = MOCK_SESSIONS.find((item) => item.id === sessionId);
  return session ? buildMockSessionDetail(session) : null;
}

/** Daftar sesi tiruan milik admin (urut dari yang terbaru). */
export const MOCK_SESSIONS: SessionSummary[] = [
  {
    id: "demo-session",
    title: "Cerdas Cermat Live — Babak Penyisihan",
    status: "active",
    createdAt: "2026-10-16T01:52:25.000Z",
    teamCount: 6,
  },
  {
    id: "final-17an",
    title: "Lomba 17 Agustus — Babak Final",
    status: "draft",
    createdAt: "2026-10-14T03:10:00.000Z",
    teamCount: 4,
  },
  {
    id: "turnamen-sekolah",
    title: "Turnamen Antar Sekolah 2026",
    status: "finished",
    createdAt: "2026-09-02T06:30:00.000Z",
    teamCount: 8,
  },
];

/** Ambil daftar sesi tiruan milik admin. */
export function getMockSessions(): SessionSummary[] {
  return MOCK_SESSIONS;
}

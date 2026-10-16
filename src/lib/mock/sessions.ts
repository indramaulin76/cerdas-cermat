/**
 * Data tiruan (mock) untuk halaman Sesi & Link.
 *
 * Dipakai admin untuk melihat daftar sesi lomba sebelum layer backend
 * menyediakan penyimpanan sungguhan. Bentuk tipe `SessionSummary` sengaja
 * dibuat sama dengan kontrak API yang menyusul.
 */

import type { SessionSummary } from "@/lib/ccl/types";
import {
  getRolePath,
  getRolePin,
  ROLE_INFO,
  ROLE_ORDER,
  type RoleId,
} from "@/lib/ccl/roles";

/** Satu link akses peran beserta PIN-nya. */
export type RoleLink = {
  role: RoleId;
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

/** Rakit detail sesi (link + PIN tiap peran) dari sebuah ringkasan sesi. */
export function buildMockSessionDetail(session: SessionSummary): SessionDetail {
  return {
    session,
    roles: ROLE_ORDER.map((role) => ({
      role,
      label: ROLE_INFO[role].label,
      description: ROLE_INFO[role].description,
      path: getRolePath(session.id, role),
      pin: getRolePin(session.id, role),
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

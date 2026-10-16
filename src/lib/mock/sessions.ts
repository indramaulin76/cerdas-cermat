/**
 * Data tiruan (mock) untuk halaman Sesi & Link.
 *
 * Dipakai admin untuk melihat daftar sesi lomba sebelum layer backend
 * menyediakan penyimpanan sungguhan. Bentuk tipe `SessionSummary` sengaja
 * dibuat sama dengan kontrak API yang menyusul.
 */

import type { SessionSummary } from "@/lib/ccl/types";

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

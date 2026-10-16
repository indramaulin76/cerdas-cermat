/**
 * Data tiruan (mock) untuk pengembangan frontend-first.
 *
 * Halaman-halaman pada fase ini dibangun di atas data ini, dengan asumsi
 * bentuk kontrak API yang sama. Saat layer backend selesai, modul ini bisa
 * diganti dengan pemanggilan API/WebSocket sungguhan tanpa mengubah UI.
 */

import type { Session, Team } from "@/lib/ccl/types";
import type { CompetitionSettings } from "@/lib/ccl/settings";

/** Daftar regu tiruan (maks. 10 sesuai PRD). */
export const MOCK_TEAMS: Team[] = [
  { id: "elang", name: "Regu Elang", color: "#f43f5e", score: 0 },
  { id: "harimau", name: "Regu Harimau", color: "#f59e0b", score: 0 },
  { id: "naga", name: "Regu Naga", color: "#22c55e", score: 0 },
  { id: "garuda", name: "Regu Garuda", color: "#3b82f6", score: 0 },
  { id: "rajawali", name: "Regu Rajawali", color: "#a855f7", score: 0 },
  { id: "komodo", name: "Regu Komodo", color: "#06b6d4", score: 0 },
];

/** Sesi lomba tiruan yang sedang "aktif". */
export const MOCK_SESSION: Session = {
  id: "demo-session",
  title: "Cerdas Cermat Live — Babak Penyisihan",
  cooldownSeconds: 10,
  correctPoints: 100,
  wrongPoints: -50,
  teams: MOCK_TEAMS,
};

/** Ambil sesi tiruan yang sedang aktif. */
export function getMockSession(): Session {
  return MOCK_SESSION;
}

/**
 * Ambil satu regu berdasarkan id (biasanya dari parameter link per-role).
 * Jatuh kembali ke regu pertama bila id tidak dikenal.
 */
export function getMockTeam(teamId?: string | null): Team {
  if (!teamId) return MOCK_TEAMS[0];
  return MOCK_TEAMS.find((team) => team.id === teamId) ?? MOCK_TEAMS[0];
}

/** Ambil regu lawan pertama (untuk mensimulasikan "regu lain lebih dulu"). */
export function getMockRival(teamId: string): Team {
  return MOCK_TEAMS.find((team) => team.id !== teamId) ?? MOCK_TEAMS[0];
}

/**
 * Ambil pengaturan lomba tiruan (waktu menjawab & nilai poin).
 *
 * Diambil dari sesi aktif supaya halaman pengaturan dan jalannya lomba memakai
 * nilai yang sama. Backend nanti membaca pengaturan tersimpan per sesi.
 */
export function getMockSettings(): CompetitionSettings {
  return {
    cooldownSeconds: MOCK_SESSION.cooldownSeconds,
    correctPoints: MOCK_SESSION.correctPoints,
    wrongPoints: MOCK_SESSION.wrongPoints,
  };
}

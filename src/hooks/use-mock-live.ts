"use client";

/**
 * Tiruan aliran realtime untuk Layar Penonton (sementara).
 *
 * Menirukan siaran server: moderator membuka soal, satu regu menekan tombol
 * jawab paling dulu sehingga muncul sorotan, lalu skor regu ikut berubah tanpa
 * memuat ulang halaman. Nanti bagian ini diganti koneksi SSE ke
 * `src/server/events.ts`; kontrak (state yang dikembalikan) dibuat sama agar
 * UI tidak perlu berubah.
 */

import { useEffect, useState } from "react";

import type { Session, Team } from "@/lib/ccl/types";

/** Lama sorotan regu tercepat bertahan, dalam milidetik. */
export const FASTEST_HOLD_MS = 5000;
/** Jeda sebelum "soal" berikutnya dibuka, dalam milidetik. */
export const NEXT_QUESTION_GAP_MS = 3500;
/** Peluang regu tercepat menjawab benar. */
const CORRECT_CHANCE = 0.75;
/** Peluang seorang "moderator" menambah/mengurangi poin regu lain di luar giliran. */
const SIDE_ADJUST_CHANCE = 0.35;

export type MockLiveState = {
  /** Regu beserta skor terkini (meniru siaran perubahan skor). */
  teams: Team[];
  /** Id regu yang menjawab paling dulu pada soal terkini, atau null. */
  fastestTeamId: string | null;
  /** Id regu yang baru saja nilainya berubah, atau null. */
  scoringTeamId: string | null;
};

/**
 * Simulasikan jalannya lomba untuk layar penonton.
 *
 * Hanya dipakai pada tahap data tiruan; saat backend realtime siap, `teams`
 * dan `fastestTeamId` akan datang dari siaran SSE.
 */
export function useMockLive(session: Session): MockLiveState {
  const { correctPoints, wrongPoints } = session;
  const [fastestTeamId, setFastestTeamId] = useState<string | null>(null);
  const [scoringTeamId, setScoringTeamId] = useState<string | null>(null);
  // Skor hidup per id regu; nama & warna tetap mengikuti `session.teams`.
  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(session.teams.map((team) => [team.id, team.score])),
  );

  // Ikatan stabil agar efek tidak dijalankan ulang setiap render.
  const teamIds = session.teams.map((team) => team.id).join(",");

  useEffect(() => {
    const ids = teamIds.split(",").filter(Boolean);
    if (ids.length === 0) return;

    let cancelled = false;
    let timer = 0;
    // Pemenang soal berjalan, disimpan lokal agar efek tak bergantung pada
    // state yang ia ubah sendiri (hemat render ulang & restart timer).
    let currentWinner: string | null = null;

    const pickRandom = () => ids[Math.floor(Math.random() * ids.length)];

    const applyScores = (fastestId: string) => {
      const correct = Math.random() < CORRECT_CHANCE;
      setScores((current) => {
        const next = { ...current };
        // Nilai jawaban regu tercepat: benar -> tambah, salah -> kurang.
        next[fastestId] =
          (next[fastestId] ?? 0) + (correct ? correctPoints : wrongPoints);
        // Sesekali moderator juga mengubah poin regu lain di luar giliran.
        if (Math.random() < SIDE_ADJUST_CHANCE) {
          const others = ids.filter((id) => id !== fastestId);
          if (others.length > 0) {
            const target = others[Math.floor(Math.random() * others.length)];
            next[target] =
              (next[target] ?? 0) +
              (Math.random() < CORRECT_CHANCE ? correctPoints : wrongPoints);
          }
        }
        return next;
      });
    };

    const openQuestion = () => {
      if (cancelled) return;
      setScoringTeamId(null);
      currentWinner = pickRandom();
      setFastestTeamId(currentWinner);

      timer = window.setTimeout(() => {
        if (cancelled || currentWinner == null) return;
        const winner = currentWinner;
        applyScores(winner);
        setScoringTeamId(winner);
        setFastestTeamId(null);

        timer = window.setTimeout(openQuestion, NEXT_QUESTION_GAP_MS);
      }, FASTEST_HOLD_MS);
    };

    timer = window.setTimeout(openQuestion, NEXT_QUESTION_GAP_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [teamIds, correctPoints, wrongPoints]);

  const teams: Team[] = session.teams.map((team) => ({
    ...team,
    score: scores[team.id] ?? team.score,
  }));

  return { teams, fastestTeamId, scoringTeamId };
}

"use client";

/**
 * Tiruan aliran realtime untuk Layar Penonton (sementara).
 *
 * Menirukan siaran server: moderator membuka soal, lalu satu regu menekan
 * tombol jawab paling dulu sehingga muncul sorotan di papan skor. Nanti bagian
 * ini diganti koneksi SSE ke `src/server/events.ts`; kontrak (state yang
 * dikembalikan) dibuat sama agar UI tidak perlu berubah.
 */

import { useEffect, useState } from "react";

import type { Session } from "@/lib/ccl/types";

/** Lama sorotan regu tercepat bertahan, dalam milidetik. */
export const FASTEST_HOLD_MS = 5000;
/** Jeda sebelum "soal" berikutnya dibuka, dalam milidetik. */
export const NEXT_QUESTION_GAP_MS = 3500;

export type MockLiveState = {
  /** Id regu yang menjawab paling dulu pada soal terkini, atau null. */
  fastestTeamId: string | null;
};

/**
 * Simulasikan regu tercepat yang berganti-ganti untuk menguji sorotan.
 *
 * Hanya dipakai pada tahap data tiruan; saat backend realtime siap, nilai
 * `fastestTeamId` akan datang dari siaran SSE.
 */
export function useMockLive(session: Session): MockLiveState {
  const [fastestTeamId, setFastestTeamId] = useState<string | null>(null);
  // Ikatan stabil agar efek tidak dijalankan ulang setiap render.
  const teamIds = session.teams.map((team) => team.id).join(",");

  useEffect(() => {
    const ids = teamIds.split(",").filter(Boolean);
    if (ids.length === 0) return;

    let cancelled = false;
    let timer = 0;

    const openQuestion = () => {
      if (cancelled) return;
      const pick = ids[Math.floor(Math.random() * ids.length)];
      setFastestTeamId(pick);

      timer = window.setTimeout(() => {
        if (cancelled) return;
        setFastestTeamId(null);
        timer = window.setTimeout(openQuestion, NEXT_QUESTION_GAP_MS);
      }, FASTEST_HOLD_MS);
    };

    timer = window.setTimeout(openQuestion, NEXT_QUESTION_GAP_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [teamIds]);

  return { fastestTeamId };
}

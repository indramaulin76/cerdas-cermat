"use client";

/**
 * Hook tombol jawab regu (versi data tiruan).
 *
 * Menirukan perilaku server real-time untuk satu regu: membuka soal lewat
 * aba-aba (hitungan mundur), menghitung cooldown, mencatat reaksi saat tombol
 * ditekan, lalu mengunci tombol secara otomatis. Nanti isi hook ini diganti
 * koneksi WebSocket + timestamp server, tetapi kontrak (state + aksi) tetap
 * sama sehingga UI tak perlu berubah.
 *
 * Catatan keadilan: `openedAt` memakai waktu `armAt` (momen tombol seharusnya
 * aktif), bukan waktu tick di klien, sehingga reaksi diukur dari aba-aba yang
 * sama untuk semua regu.
 */

import { useCallback, useEffect, useState } from "react";

import type { BuzzerState, BuzzWinner } from "@/lib/ccl/types";

/** Durasi aba-aba (hitungan mundur) sebelum tombol aktif, dalam milidetik. */
export const ABA_ABA_MS = 3000;

const IDLE_STATE: BuzzerState = {
  phase: "waiting",
  openedAt: null,
  armAt: null,
  deadlineAt: null,
  remainingMs: 0,
  reactionMs: null,
  winner: null,
  lockReason: null,
};

export type UseTeamBuzzerResult = {
  state: BuzzerState;
  /** Moderator membuka soal: mulai aba-aba, lalu tombol aktif & cooldown berjalan. */
  startQuestion: () => void;
  /** Regu menekan tombol jawab. */
  buzz: () => void;
  /** Tirukan regu lain yang menekan lebih dulu (mengunci tombol regu ini). */
  lockByRival: (rival: { id: string; name: string }) => void;
  /** Reset ke layar siap menunggu (soal berikutnya). */
  reset: () => void;
};

export function useTeamBuzzer(
  teamId: string,
  teamName: string,
  cooldownSeconds: number,
): UseTeamBuzzerResult {
  const [state, setState] = useState<BuzzerState>(IDLE_STATE);

  // Penghitung waktu untuk aba-aba (countdown) dan cooldown.
  useEffect(() => {
    if (state.phase !== "countdown" && state.phase !== "open") return;

    const tick = () => {
      const now = performance.now();
      setState((current) => {
        if (current.phase === "countdown") {
          if (current.armAt == null) return current;
          const remainingMs = current.armAt - now;
          if (remainingMs <= 0) {
            // Aba-aba selesai: tombol aktif serentak, cooldown mulai.
            const openedAt = current.armAt;
            return {
              ...current,
              phase: "open",
              openedAt,
              deadlineAt: openedAt + cooldownSeconds * 1000,
              remainingMs: cooldownSeconds * 1000,
            };
          }
          return { ...current, remainingMs };
        }

        if (current.phase === "open") {
          if (current.deadlineAt == null) return current;
          const remainingMs = current.deadlineAt - now;
          if (remainingMs <= 0) {
            return {
              ...current,
              phase: "locked",
              remainingMs: 0,
              lockReason: "timeout",
            };
          }
          return { ...current, remainingMs };
        }

        return current;
      });
    };

    tick();
    const intervalId = window.setInterval(tick, 60);
    return () => window.clearInterval(intervalId);
  }, [state.phase, state.armAt, state.deadlineAt, cooldownSeconds]);

  const startQuestion = useCallback(() => {
    const armAt = performance.now() + ABA_ABA_MS;
    setState({
      ...IDLE_STATE,
      phase: "countdown",
      armAt,
      remainingMs: ABA_ABA_MS,
    });
  }, []);

  const buzz = useCallback(() => {
    setState((current) => {
      if (current.phase !== "open" || current.openedAt == null) return current;
      const reactionMs = Math.max(
        0,
        Math.round(performance.now() - current.openedAt),
      );
      const winner: BuzzWinner = { teamId, name: teamName, reactionMs };
      return {
        ...current,
        phase: "locked",
        remainingMs: 0,
        reactionMs,
        winner,
        lockReason: "self",
      };
    });
  }, [teamId, teamName]);

  const lockByRival = useCallback((rival: { id: string; name: string }) => {
    setState((current) => {
      if (current.phase !== "open" || current.openedAt == null) return current;
      const reactionMs = Math.max(
        0,
        Math.round(performance.now() - current.openedAt),
      );
      const winner: BuzzWinner = {
        teamId: rival.id,
        name: rival.name,
        reactionMs,
      };
      return {
        ...current,
        phase: "locked",
        remainingMs: 0,
        reactionMs: null,
        winner,
        lockReason: "rival",
      };
    });
  }, []);

  const reset = useCallback(() => setState(IDLE_STATE), []);

  return { state, startQuestion, buzz, lockByRival, reset };
}

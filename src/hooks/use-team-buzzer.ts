"use client";

/**
 * Hook tombol jawab regu (versi data tiruan).
 *
 * Menirukan perilaku server real-time untuk satu regu: membuka soal, menghitung
 * cooldown, mencatat reaksi saat tombol ditekan, lalu mengunci tombol secara
 * otomatis. Nanti isi hook ini diganti koneksi WebSocket + timestamp server,
 * tetapi kontrak (state + aksi) tetap sama sehingga UI tak perlu berubah.
 */

import { useCallback, useEffect, useState } from "react";

import type {
  BuzzerState,
  BuzzWinner,
} from "@/lib/ccl/types";

const IDLE_STATE: BuzzerState = {
  phase: "waiting",
  openedAt: null,
  deadlineAt: null,
  remainingMs: 0,
  reactionMs: null,
  winner: null,
  lockReason: null,
};

export type UseTeamBuzzerResult = {
  state: BuzzerState;
  /** Moderator membuka soal: tombol aktif & cooldown mulai berjalan. */
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

  // Hitung mundur cooldown selama soal terbuka; tutup otomatis saat habis.
  useEffect(() => {
    if (state.phase !== "open" || state.deadlineAt == null) return;

    const deadline = state.deadlineAt;
    const tick = () => {
      const remainingMs = Math.max(0, deadline - performance.now());
      setState((current) => {
        if (current.phase !== "open") return current;
        if (remainingMs <= 0) {
          return {
            ...current,
            phase: "locked",
            remainingMs: 0,
            lockReason: "timeout",
          };
        }
        return { ...current, remainingMs };
      });
    };

    tick();
    const intervalId = window.setInterval(tick, 60);
    return () => window.clearInterval(intervalId);
  }, [state.phase, state.deadlineAt]);

  const startQuestion = useCallback(() => {
    const openedAt = performance.now();
    const durationMs = cooldownSeconds * 1000;
    setState({
      ...IDLE_STATE,
      phase: "open",
      openedAt,
      deadlineAt: openedAt + durationMs,
      remainingMs: durationMs,
    });
  }, [cooldownSeconds]);

  const buzz = useCallback(() => {
    setState((current) => {
      if (current.phase !== "open" || current.openedAt == null) return current;
      const reactionMs = Math.max(0, Math.round(performance.now() - current.openedAt));
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
      const reactionMs = Math.max(0, Math.round(performance.now() - current.openedAt));
      const winner: BuzzWinner = { teamId: rival.id, name: rival.name, reactionMs };
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

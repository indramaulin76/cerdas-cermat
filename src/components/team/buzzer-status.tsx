"use client";

/**
 * Layar status di bawah tombol jawab.
 *
 * Menampilkan kondisi lomba secara ringkas sesuai fase:
 * - `waiting`   — layar siap menunggu (calm).
 * - `countdown` — aba-aba: angka hitungan mundur besar sebelum tombol aktif.
 * - `open`      — cooldown waktu menjawab berjalan.
 * - `locked`    — hasil singkat (menang / terkunci / waktu habis).
 */

import { Timer, TriangleAlert, Trophy, Zap } from "lucide-react";

import type { BuzzerState } from "@/lib/ccl/types";

type BuzzerStatusProps = {
  state: BuzzerState;
  color: string;
  cooldownSeconds: number;
};

export function BuzzerStatus({ state, color, cooldownSeconds }: BuzzerStatusProps) {
  const { phase, remainingMs, lockReason, winner, reactionMs } = state;

  if (phase === "countdown") {
    const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
    return (
      <div className="flex w-full flex-col items-center gap-1 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Aba-aba · bersiap
        </p>
        <p
          key={seconds}
          className="animate-ccl-countdown text-6xl font-black tabular-nums motion-reduce:animate-none sm:text-7xl"
          style={{ color }}
          aria-hidden
        >
          {seconds}
        </p>
        <p className="text-xs text-muted-foreground">
          Jangan lepas HP-mu — tombol aktif sebentar lagi.
        </p>
      </div>
    );
  }

  if (phase === "open") {
    const progress = Math.max(
      0,
      Math.min(1, remainingMs / (cooldownSeconds * 1000)),
    );
    return (
      <div className="w-full max-w-xs">
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Zap className="size-3.5" aria-hidden />
            Waktu menjawab
          </span>
          <span className="font-semibold tabular-nums text-foreground">
            {Math.ceil(remainingMs / 1000)}s
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-[width] duration-100 ease-linear"
            style={{ width: `${progress * 100}%`, backgroundColor: color }}
          />
        </div>
      </div>
    );
  }

  if (phase === "locked") {
    if (lockReason === "self") {
      return (
        <p className="inline-flex items-center gap-2 text-sm font-medium text-amber-300">
          <Trophy className="size-4" aria-hidden />
          Terdeteksi paling cepat oleh sistem · {reactionMs ?? 0} ms
        </p>
      );
    }
    if (lockReason === "rival") {
      return (
        <p className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Timer className="size-4" aria-hidden />
          {winner?.name ?? "Regu lain"} lebih cepat ({winner?.reactionMs ?? 0} ms)
        </p>
      );
    }
    return (
      <p className="inline-flex items-center gap-2 text-sm font-medium text-rose-300">
        <TriangleAlert className="size-4" aria-hidden />
        Waktu habis — tidak ada regu yang menekan
      </p>
    );
  }

  // waiting
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="inline-flex items-center gap-1.5">
        <span
          className="size-1.5 animate-pulse rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span
          className="size-1.5 animate-pulse rounded-full [animation-delay:200ms]"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span
          className="size-1.5 animate-pulse rounded-full [animation-delay:400ms]"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      </span>
      <p className="text-xs text-muted-foreground">
        Layar siap menunggu. Tombol aktif otomatis saat moderator membuka soal.
      </p>
    </div>
  );
}

"use client";

/**
 * Halaman tombol jawab regu (versi data tiruan).
 *
 * Menampilkan layar "siap menunggu", tombol jawab besar, dan status terkunci
 * otomatis. Seluruh state lomba masih ditirukan secara lokal lewat
 * `useTeamBuzzer`; kontraknya sudah disamakan dengan API real-time yang akan
 * menyusul, sehingga UI tidak perlu berubah saat backend tersedia.
 */

import { Trophy, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useTeamBuzzer } from "@/hooks/use-team-buzzer";
import type { BuzzerLockReason, Session, Team } from "@/lib/ccl/types";
import {
  AnswerButton,
  type AnswerButtonVisual,
} from "@/components/team/answer-button";
import { ModeratorSimulator } from "@/components/team/moderator-simulator";
import { cn } from "cn";

type TeamBuzzerProps = {
  session: Session;
  team: Team;
  rival: Team;
};

const PHASE_BADGE: Record<
  BuzzerLockReason | "waiting" | "open",
  { label: string; className: string }
> = {
  waiting: {
    label: "Siap",
    className: "border-border/70 bg-muted text-muted-foreground",
  },
  open: {
    label: "Soal dibuka",
    className: "border-transparent bg-emerald-500/15 text-emerald-400",
  },
  self: {
    label: "Kamu tercepat",
    className: "border-transparent bg-amber-400/15 text-amber-300",
  },
  rival: {
    label: "Terkunci",
    className: "border-border/70 bg-muted text-muted-foreground",
  },
  timeout: {
    label: "Waktu habis",
    className: "border-transparent bg-rose-500/15 text-rose-300",
  },
};

export function TeamBuzzer({ session, team, rival }: TeamBuzzerProps) {
  const { state, startQuestion, buzz, lockByRival, reset } = useTeamBuzzer(
    team.id,
    team.name,
    session.cooldownSeconds,
  );

  const isOpen = state.phase === "open";
  const lockedBySelf = state.lockReason === "self";
  const lockedByRival = state.lockReason === "rival";
  const timedOut = state.lockReason === "timeout";

  const remainingSeconds = Math.ceil(state.remainingMs / 1000);
  const cooldownProgress = isOpen
    ? Math.max(0, Math.min(1, state.remainingMs / (session.cooldownSeconds * 1000)))
    : 0;

  const phaseKey = state.phase === "open" ? "open" : state.phase === "waiting" ? "waiting" : state.lockReason ?? "waiting";
  const badge = PHASE_BADGE[phaseKey];

  // Petakan state lomba ke tampilan tombol jawab.
  const buttonVisual: AnswerButtonVisual = isOpen
    ? "armed"
    : lockedBySelf
      ? "won"
      : lockedByRival
        ? "locked"
        : timedOut
          ? "timeout"
          : "waiting";

  const label = isOpen
    ? "TEKAN!"
    : lockedBySelf
      ? "KAMU DULUAN!"
      : lockedByRival
        ? "TERKUNCI"
        : timedOut
          ? "WAKTU HABIS"
          : "SIAP MENUNGGU";

  const sublabel = isOpen
    ? "Jawab sekarang — siapa cepat, dia dapat"
    : lockedBySelf
      ? `Reaksi ${state.reactionMs ?? 0} ms`
      : lockedByRival
        ? `${state.winner?.name ?? rival.name} lebih cepat · ${state.winner?.reactionMs ?? 0} ms`
        : timedOut
          ? "Tidak ada regu yang menekan"
          : "Menunggu moderator membuka soal";

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      {/* Latar bernuansa energi, mengikuti warna regu. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background: `radial-gradient(120% 80% at 50% -10%, color-mix(in oklab, ${team.color} 22%, transparent) 0%, transparent 55%), radial-gradient(90% 60% at 50% 115%, color-mix(in oklab, ${team.color} 14%, transparent) 0%, transparent 60%)`,
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 py-6">
        {/* Header */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2.5">
              <span
                className={cn(
                  "absolute inline-flex size-full rounded-full opacity-75",
                  isOpen ? "animate-ping" : "animate-pulse",
                )}
                style={{ backgroundColor: team.color }}
              />
              <span
                className="relative inline-flex size-2.5 rounded-full"
                style={{ backgroundColor: team.color }}
              />
            </span>
            <span className="text-sm font-medium tracking-tight">
              Cerdas Cermat Live
            </span>
          </div>
          <Badge variant="outline" className={cn("font-medium", badge.className)}>
            {badge.label}
          </Badge>
        </header>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          {session.title}
        </p>

        {/* Identitas regu */}
        <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/60 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <span
              className="flex size-9 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: team.color }}
              aria-hidden
            >
              {team.name.replace(/^Regu\s+/i, "").charAt(0).toUpperCase()}
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">{team.name}</p>
              <p className="text-xs text-muted-foreground">Layar tombol jawab</p>
            </div>
          </div>
          <div className="text-right leading-tight">
            <p className="text-xs text-muted-foreground">Skor</p>
            <p className="text-lg font-bold tabular-nums">{team.score}</p>
          </div>
        </div>

        {/* Tombol jawab besar */}
        <div className="flex flex-1 flex-col items-center justify-center gap-5">
          <AnswerButton
            visual={buttonVisual}
            color={team.color}
            label={label}
            sublabel={sublabel}
            onPress={buzz}
            ariaLabel={
              isOpen
                ? `Tekan tombol jawab untuk ${team.name}`
                : `Tombol jawab ${team.name} belum aktif`
            }
          />

          {/* Cooldown */}
          {isOpen ? (
            <div className="w-full max-w-xs">
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Zap className="size-3.5" aria-hidden />
                  Waktu menjawab
                </span>
                <span className="font-semibold tabular-nums text-foreground">
                  {remainingSeconds}s
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-[width] duration-100 ease-linear"
                  style={{
                    width: `${cooldownProgress * 100}%`,
                    backgroundColor: team.color,
                  }}
                />
              </div>
            </div>
          ) : lockedBySelf ? (
            <p className="inline-flex items-center gap-2 text-sm font-medium text-amber-300">
              <Trophy className="size-4" aria-hidden />
              Terdeteksi paling cepat oleh sistem
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Tombol akan aktif otomatis saat moderator membuka soal.
            </p>
          )}
        </div>

        {/* Panel simulasi moderator (data tiruan) */}
        <ModeratorSimulator
          state={state}
          rivalName={rival.name}
          onStart={startQuestion}
          onRival={() => lockByRival({ id: rival.id, name: rival.name })}
          onReset={reset}
        />
      </div>
    </main>
  );
}

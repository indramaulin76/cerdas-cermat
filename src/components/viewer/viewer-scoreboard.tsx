"use client";

import type { Team } from "@/lib/ccl/types";
import { cn } from "cn";

/**
 * Papan skor besar untuk layar penonton.
 *
 * Menampilkan semua regu (maks. 10 sesuai PRD) dengan nama dan skor berukuran
 * besar agar terbaca dari jauh. Regu diurutkan dari skor tertinggi. Bila ada
 * `highlightTeamId` (regu yang menekan tombol jawab paling dulu), kartu regu
 * itu disorot dengan tanda khusus dan animasi yang mencuri perhatian.
 */

/** Warna medali untuk tiga peringkat teratas. */
const RANK_ACCENT: Record<number, string> = {
  1: "text-amber-400",
  2: "text-slate-300",
  3: "text-orange-400",
};

/** Inisial singkat nama regu (buang kata "Regu"). */
function teamInitial(name: string): string {
  const cleaned = name.replace(/^Regu\s+/i, "").trim();
  return (cleaned.charAt(0) || "?").toUpperCase();
}

export function ViewerScoreboard({
  teams,
  highlightTeamId = null,
  scoringTeamId = null,
}: {
  teams: Team[];
  /** Id regu tercepat yang sedang disorot (opsional). */
  highlightTeamId?: string | null;
  /** Id regu yang baru saja nilainya berubah (opsional). */
  scoringTeamId?: string | null;
}) {
  const standings = [...teams].sort((a, b) => b.score - a.score);
  const leaderScore = standings[0]?.score ?? 0;

  return (
    <ol className="grid flex-1 grid-cols-1 content-start gap-4 sm:grid-cols-2">
      {standings.map((team, index) => {
        const rank = index + 1;
        const isLeader = rank === 1 && leaderScore > 0;
        const isFastest = team.id === highlightTeamId;
        const isScoring = team.id === scoringTeamId;

        return (
          <li
            key={team.id}
            className={cn(
              "relative flex items-center gap-4 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:gap-6 sm:p-6",
              isLeader && "border-amber-400/50",
              isFastest && "z-10 animate-ccl-highlight border-transparent",
            )}
            style={{
              boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${team.color} 40%, transparent), 0 18px 40px -24px color-mix(in oklch, ${team.color} 80%, transparent)`,
            }}
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-2"
              style={{ backgroundColor: team.color }}
            />

            {/* Cahaya berdenyut untuk regu tercepat. */}
            {isFastest ? (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 animate-ccl-glow rounded-3xl"
                style={{
                  boxShadow: `inset 0 0 0 4px ${team.color}, inset 0 0 42px 6px color-mix(in oklch, ${team.color} 65%, transparent)`,
                }}
              />
            ) : null}

            <span
              className={cn(
                "relative w-8 shrink-0 text-center text-2xl font-black tabular-nums sm:text-3xl",
                RANK_ACCENT[rank] ?? "text-muted-foreground/70",
              )}
            >
              {rank}
            </span>

            <span
              className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-white sm:size-16 sm:text-3xl"
              style={{
                backgroundColor: team.color,
                boxShadow: `0 0 24px -2px color-mix(in oklch, ${team.color} 70%, transparent)`,
              }}
              aria-hidden
            >
              {teamInitial(team.name)}
            </span>

            <div className="relative min-w-0 flex-1">
              <p className="truncate text-xl font-black tracking-tight sm:text-2xl">
                {team.name}
              </p>
              {isFastest ? (
                <p className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-amber-300 uppercase">
                  <span className="size-1.5 animate-pulse rounded-full bg-amber-300" />
                  Tercepat
                </p>
              ) : isLeader ? (
                <p className="text-xs font-semibold tracking-wide text-amber-400 uppercase">
                  Unggul
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Peringkat {rank}</p>
              )}
            </div>

            <span
              className={cn(
                "relative shrink-0 text-5xl leading-none font-black tabular-nums sm:text-6xl",
                isScoring && "animate-ccl-pop",
              )}
              style={{
                textShadow: `0 0 22px color-mix(in oklch, ${team.color} 65%, transparent)`,
              }}
            >
              {team.score}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

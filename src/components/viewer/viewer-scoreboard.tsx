"use client";

import type { Team } from "@/lib/ccl/types";
import { cn } from "cn";

/**
 * Papan skor besar untuk layar penonton.
 *
 * Menampilkan semua regu (maks. 10 sesuai PRD) dengan nama dan skor berukuran
 * besar agar terbaca dari jauh. Regu diurutkan dari skor tertinggi. Komponen ini
 * murni menampilkan data; pembaruan realtime dan sorotan regu tercepat
 * ditambahkan pada tugas berikutnya.
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

export function ViewerScoreboard({ teams }: { teams: Team[] }) {
  const standings = [...teams].sort((a, b) => b.score - a.score);
  const leaderScore = standings[0]?.score ?? 0;

  return (
    <ol className="grid flex-1 grid-cols-1 content-start gap-4 sm:grid-cols-2">
      {standings.map((team, index) => {
        const rank = index + 1;
        const isLeader = rank === 1 && leaderScore > 0;

        return (
          <li
            key={team.id}
            className={cn(
              "relative flex items-center gap-4 overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-5 backdrop-blur sm:gap-6 sm:p-6",
              isLeader && "border-amber-400/60",
            )}
            style={{
              boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${team.color} 45%, transparent)`,
            }}
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-2"
              style={{ backgroundColor: team.color }}
            />

            <span
              className={cn(
                "w-8 shrink-0 text-center text-2xl font-black tabular-nums sm:text-3xl",
                RANK_ACCENT[rank] ?? "text-muted-foreground/70",
              )}
            >
              {rank}
            </span>

            <span
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-white sm:size-16 sm:text-3xl"
              style={{ backgroundColor: team.color }}
              aria-hidden
            >
              {teamInitial(team.name)}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-black tracking-tight sm:text-2xl">
                {team.name}
              </p>
              {isLeader ? (
                <p className="text-xs font-semibold tracking-wide text-amber-400 uppercase">
                  Unggul
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Peringkat {rank}</p>
              )}
            </div>

            <span className="shrink-0 text-5xl leading-none font-black tabular-nums sm:text-6xl">
              {team.score}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

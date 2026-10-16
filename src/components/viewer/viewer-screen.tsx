"use client";

import { Badge } from "@/components/ui/badge";
import type { Session } from "@/lib/ccl/types";
import { cn } from "cn";

/**
 * Halaman utama Layar Penonton.
 *
 * Tampilan besar untuk proyektor: judul lomba, papan skor semua regu, dan
 * penanda status. Pada tahap ini memakai data tiruan; tugas-tugas berikutnya
 * menambahkan papan skor besar, sorotan regu tercepat, gerbang PIN, dan
 * pembaruan realtime.
 */

/** Inisial singkat nama regu (buang kata "Regu"). */
function teamInitial(name: string): string {
  const cleaned = name.replace(/^Regu\s+/i, "").trim();
  return (cleaned.charAt(0) || "?").toUpperCase();
}

export function ViewerScreen({ session }: { session: Session }) {
  const standings = [...session.teams].sort((a, b) => b.score - a.score);
  const leaderScore = standings[0]?.score ?? 0;

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      {/* Latar bercahaya ala panggung lomba. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_-20%,color-mix(in_oklch,var(--color-primary)_22%,transparent),transparent_60%)]"
      />

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 px-6 py-6 sm:px-10">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-lg font-black text-primary-foreground">
            CC
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Cerdas Cermat Live
            </p>
            <p className="text-lg font-bold">{session.title}</p>
          </div>
        </div>

        <Badge className="gap-2 border-transparent bg-emerald-500/15 px-3 py-1 text-emerald-400">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          LIVE
        </Badge>
      </header>

      <section className="relative z-10 flex flex-1 flex-col gap-6 px-6 pb-6 sm:px-10">
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Papan Skor
          </h1>
          <p className="text-sm text-muted-foreground">
            {standings.length} regu bertanding
          </p>
        </div>

        <ol className="grid flex-1 grid-cols-1 content-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {standings.map((team, index) => {
            const isLeader = team.score === leaderScore && leaderScore > 0;
            return (
              <li
                key={team.id}
                className={cn(
                  "relative flex items-center gap-4 overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-5 backdrop-blur",
                  isLeader && "border-amber-400/50",
                )}
                style={{
                  boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${team.color} 40%, transparent)`,
                }}
              >
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-1.5"
                  style={{ backgroundColor: team.color }}
                />

                <span className="w-6 text-center text-lg font-black text-muted-foreground tabular-nums">
                  {index + 1}
                </span>

                <span
                  className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white"
                  style={{ backgroundColor: team.color }}
                  aria-hidden
                >
                  {teamInitial(team.name)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold">{team.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Peringkat {index + 1}
                  </p>
                </div>

                <span className="text-3xl font-black tabular-nums sm:text-4xl">
                  {team.score}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <footer className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 px-6 py-4 text-xs text-muted-foreground sm:px-10">
        <p>Waktu jawab {session.cooldownSeconds}s</p>
        <p>
          Benar +{session.correctPoints} · Salah {session.wrongPoints}
        </p>
        <p className="font-medium">Skor diperbarui otomatis</p>
      </footer>
    </main>
  );
}

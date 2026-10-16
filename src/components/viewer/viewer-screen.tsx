"use client";

import { Badge } from "@/components/ui/badge";
import { ViewerScoreboard } from "@/components/viewer/viewer-scoreboard";
import type { Session } from "@/lib/ccl/types";

/**
 * Halaman utama Layar Penonton.
 *
 * Tampilan besar untuk proyektor: judul lomba, papan skor semua regu, dan
 * penanda status. Pada tahap ini memakai data tiruan; tugas-tugas berikutnya
 * menambahkan gerbang PIN, sorotan regu tercepat, dan pembaruan realtime.
 */
export function ViewerScreen({ session }: { session: Session }) {
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
            {session.teams.length} regu bertanding
          </p>
        </div>

        <ViewerScoreboard teams={session.teams} />
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

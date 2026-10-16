"use client";

import { Badge } from "@/components/ui/badge";
import { ViewerScoreboard } from "@/components/viewer/viewer-scoreboard";
import { useMockLive } from "@/hooks/use-mock-live";
import { AURORA_COLORS } from "@/lib/ccl/theme";
import type { Session } from "@/lib/ccl/types";

/**
 * Halaman utama Layar Penonton.
 *
 * Tampilan besar untuk proyektor: judul lomba, papan skor semua regu, sorotan
 * regu tercepat, dan penanda status. Pada tahap ini seluruh data (termasuk
 * pembaruan skor dan sorotan) berasal dari tiruan; nanti diganti siaran SSE.
 */
export function ViewerScreen({ session }: { session: Session }) {
  const { teams, fastestTeamId, scoringTeamId } = useMockLive(session);
  const fastestTeam = teams.find((team) => team.id === fastestTeamId) ?? null;

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      {/* Latar aurora bergerak ala panggung lomba. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_-20%,color-mix(in_oklch,var(--color-primary)_18%,transparent),transparent_60%)]" />
        <div
          className="absolute -top-40 -left-32 size-[36rem] animate-ccl-aurora rounded-full opacity-25 blur-[120px]"
          style={{ backgroundColor: AURORA_COLORS[0] }}
        />
        <div
          className="absolute -right-24 -bottom-52 size-[40rem] animate-ccl-aurora-slow rounded-full opacity-20 blur-[130px]"
          style={{ backgroundColor: AURORA_COLORS[1] }}
        />
        <div
          className="absolute top-1/4 left-1/3 size-[30rem] animate-ccl-aurora-slow rounded-full opacity-15 blur-[140px]"
          style={{ backgroundColor: AURORA_COLORS[2] }}
        />
      </div>

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 px-6 py-6 sm:px-10">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400 text-lg font-black text-white shadow-lg shadow-fuchsia-500/30">
            CC
          </span>
          <div className="leading-tight">
            <p className="bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-sm font-semibold tracking-widest text-transparent uppercase">
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

      {/* Sorotan regu tercepat. */}
      <div
        className="relative z-10 px-6 sm:px-10"
        aria-live="polite"
        aria-atomic="true"
      >
        {fastestTeam ? (
          <div
            className="flex animate-ccl-pop items-center justify-center gap-3 rounded-2xl border px-5 py-3 text-center"
            style={{
              borderColor: `color-mix(in oklch, ${fastestTeam.color} 60%, transparent)`,
              backgroundColor: `color-mix(in oklch, ${fastestTeam.color} 18%, transparent)`,
            }}
          >
            <span className="text-xl">⚡</span>
            <p className="text-lg font-bold sm:text-xl">
              {fastestTeam.name} menjawab paling dulu!
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-border/50 bg-card/40 px-5 py-3">
            <p className="text-sm text-muted-foreground">
              Menunggu regu menekan tombol jawab…
            </p>
          </div>
        )}
      </div>

      <section className="relative z-10 flex flex-1 flex-col gap-6 px-6 pb-6 sm:px-10">
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-8 w-1.5 rounded-full bg-gradient-to-b from-fuchsia-400 to-cyan-400" />
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Papan Skor
            </h1>
          </div>
          <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-muted-foreground">
            {teams.length} regu bertanding
          </p>
        </div>

        <ViewerScoreboard
          teams={teams}
          highlightTeamId={fastestTeamId}
          scoringTeamId={scoringTeamId}
        />
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


"use client";

import { Badge } from "@/components/ui/badge";
import type { Session } from "@/lib/ccl/types";
import { useTeamBuzzer } from "@/hooks/use-team-buzzer";
import { ModeratorSimulator } from "@/components/team/moderator-simulator";
import { getMockRival } from "@/lib/mock/session";

export function ModeratorDashboard({ session }: { session: Session }) {
  const firstTeam = session.teams[0] ?? { id: "none", name: "—", color: "#64748b" };
  const { state, startQuestion, lockByRival, reset } = useTeamBuzzer(
    firstTeam.id,
    firstTeam.name,
    session.cooldownSeconds,
  );

  const rival = getMockRival(firstTeam.id);

  return (
    <main className="relative flex min-h-dvh flex-col bg-background text-foreground">
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard Moderator</h1>
            <p className="text-sm text-muted-foreground">{session.title}</p>
          </div>
          <Badge variant="outline" className="text-muted-foreground">Fase 1 · Layout & kontrol (data tiruan)</Badge>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-border/70 bg-card/70 p-4 backdrop-blur">
            <h2 className="text-base font-semibold">Regu terdaftar</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {session.teams.map((team) => (
                <div key={team.id} className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: team.color }} aria-hidden>
                      {team.name.replace(/^Regu\s+/i, "").charAt(0).toUpperCase()}
                    </span>
                    <span className="text-sm">{team.name}</span>
                  </div>
                  <span className="text-sm font-medium tabular-nums">{team.score}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-card/70 p-4 backdrop-blur">
            <h2 className="text-base font-semibold">Kontrol lomba</h2>
            <p className="mt-1 text-sm text-muted-foreground">Mulai soal, aba-aba, kunci otomatis & reset. Simulasi untuk pengujian UI.</p>
            <div className="mt-4">
              <ModeratorSimulator
                state={state}
                rivalName={rival.name}
                onStart={startQuestion}
                onRival={() => lockByRival({ id: rival.id, name: rival.name })}
                onReset={reset}
              />
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Fase aktif: {state.phase} · Sisa: {Math.max(0, Math.ceil(state.remainingMs/1000))}s{state.winner ? ` · Pemenang: ${state.winner.name}` : ""}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

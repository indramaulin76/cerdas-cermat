"use client";

import { Badge } from "@/components/ui/badge";
import type { Team } from "@/lib/ccl/types";

/**
 * Halaman kelola regu (dipakai admin sebelum lomba dimulai).
 *
 * Tahap ini menampilkan daftar regu dari data tiruan. Kontrol tambah/kurang,
 * ubah nama, dan pemilih warna ditambahkan pada tugas-tugas berikutnya.
 */
export function TeamManager({
  teams,
  maxTeams,
}: {
  teams: Team[];
  maxTeams: number;
}) {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-clip bg-background text-foreground">
      {/* Latar bercahaya. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(120%_110%_at_50%_-20%,color-mix(in_oklch,var(--color-primary)_16%,transparent),transparent_60%)]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-8 sm:px-8">
        <header className="space-y-2">
          <Badge variant="outline" className="text-muted-foreground">
            Fase 2 · data tiruan
          </Badge>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Kelola Regu
          </h1>
          <p className="text-sm text-muted-foreground">
            Atur jumlah, nama, dan warna regu peserta (maksimal {maxTeams}{" "}
            regu) sebelum lomba dimulai.
          </p>
        </header>

        {teams.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 px-5 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada regu. Tambahkan regu peserta untuk memulai.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2">
            {teams.map((team, index) => (
              <li
                key={team.id}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur"
              >
                <span className="w-5 text-center text-sm font-bold text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl text-base font-black text-white"
                  style={{ backgroundColor: team.color }}
                  aria-hidden
                >
                  {team.name.replace(/^Regu\s+/i, "").charAt(0).toUpperCase() ||
                    "?"}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {team.name}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

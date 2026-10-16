"use client";

import { useCallback, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Team } from "@/lib/ccl/types";

/**
 * Halaman kelola regu (dipakai admin sebelum lomba dimulai).
 *
 * Tahap ini sudah bisa menambah dan mengurangi regu dengan batas maksimal
 * (lihat `maxTeams`). Ubah nama dan pemilih warna ditambahkan pada tugas
 * berikutnya.
 */

/** Warna sementara untuk regu baru; pemilih warna menyusul. */
const DEFAULT_COLOR = "#64748b";

/** Id unik untuk regu baru. */
function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `team-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Nama default "Regu N" dengan N terkecil yang belum terpakai. */
function nextTeamName(teams: Team[]): string {
  const used = new Set(teams.map((team) => team.name.trim().toLowerCase()));
  let n = teams.length + 1;
  while (used.has(`regu ${n}`)) n += 1;
  return `Regu ${n}`;
}

/** Kumpulan nama regu (huruf kecil, tanpa spasi tepi) yang dipakai lebih dari satu regu. */
function findDuplicateNames(teams: Team[]): Set<string> {
  const counts = new Map<string, number>();
  for (const team of teams) {
    const key = team.name.trim().toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const duplicates = new Set<string>();
  for (const [key, count] of counts) {
    if (count > 1) duplicates.add(key);
  }
  return duplicates;
}

/** Pesan kesalahan nama regu, atau null bila valid. */
function teamNameError(team: Team, duplicateNames: Set<string>): string | null {
  const trimmed = team.name.trim();
  if (!trimmed) return "Nama regu tidak boleh kosong.";
  if (duplicateNames.has(trimmed.toLowerCase())) {
    return "Nama regu sudah dipakai regu lain.";
  }
  return null;
}

export function TeamManager({
  initialTeams,
  maxTeams,
}: {
  initialTeams: Team[];
  maxTeams: number;
}) {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [notice, setNotice] = useState<string | null>(null);

  const atMax = teams.length >= maxTeams;

  const addTeam = useCallback(() => {
    if (teams.length >= maxTeams) {
      setNotice(
        `Maksimal ${maxTeams} regu. Hapus salah satu regu untuk menambah.`,
      );
      return;
    }
    setNotice(null);
    setTeams((current) =>
      current.length >= maxTeams
        ? current
        : [
            ...current,
            {
              id: newId(),
              name: nextTeamName(current),
              color: DEFAULT_COLOR,
              score: 0,
            },
          ],
    );
  }, [teams.length, maxTeams]);

  const removeTeam = useCallback((id: string) => {
    setNotice(null);
    setTeams((current) => current.filter((team) => team.id !== id));
  }, []);

  const updateName = useCallback((id: string, name: string) => {
    setTeams((current) =>
      current.map((team) => (team.id === id ? { ...team, name } : team)),
    );
  }, []);

  const duplicateNames = findDuplicateNames(teams);

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Kelola Regu
            </h1>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium tabular-nums">
              {teams.length} / {maxTeams} regu
            </span>
          </div>
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
            {teams.map((team, index) => {
              const error = teamNameError(team, duplicateNames);
              return (
                <li
                  key={team.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur sm:gap-4"
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
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      value={team.name}
                      onChange={(event) =>
                        updateName(team.id, event.target.value)
                      }
                      aria-label={`Nama regu ${index + 1}`}
                      aria-invalid={error ? true : undefined}
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold outline-none transition-colors focus-visible:border-fuchsia-400 focus-visible:ring-2 focus-visible:ring-fuchsia-400/30 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/30"
                    />
                    {error ? (
                      <p className="mt-1 text-xs text-destructive">{error}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTeam(team.id)}
                    aria-label={`Hapus ${team.name || `regu ${index + 1}`}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            onClick={addTeam}
            disabled={atMax}
            aria-describedby="team-limit-hint"
            className="h-11 w-full border-dashed"
          >
            <Plus />
            Tambah Regu
          </Button>

          <p
            id="team-limit-hint"
            role="status"
            aria-live="polite"
            className="min-h-5 text-center text-sm text-muted-foreground"
          >
            {notice ??
              (atMax
                ? `Sudah mencapai batas maksimal ${maxTeams} regu.`
                : `Bisa menambah ${maxTeams - teams.length} regu lagi.`)}
          </p>
        </div>
      </div>
    </main>
  );
}

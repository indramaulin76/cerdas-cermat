"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TEAM_COLORS } from "@/lib/ccl/team-colors";
import type { Team } from "@/lib/ccl/types";
import { teamPath, teamsPath } from "@/lib/ccl/api";

/**
 * Halaman kelola regu (dipakai admin sebelum lomba dimulai).
 *
 * Mendukung menambah/mengurangi regu (maksimal lihat `maxTeams`), ubah nama
 * dengan validasi, dan warna otomatis yang bisa disesuaikan lewat pemilih
 * warna. Warna disimpan di data regu sehingga tampil sama di semua dashboard.
 */

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
  sessionId,
  initialTeams,
  maxTeams,
}: {
  sessionId: string;
  initialTeams: Team[];
  maxTeams: number;
}) {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [notice, setNotice] = useState<string | null>(null);
  const [openColorId, setOpenColorId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadTeams = useCallback(async () => {
    const response = await fetch(teamsPath(sessionId), {
      credentials: "same-origin",
    });
    const result = (await response.json()) as {
      teams?: Array<Team & { sessionId: string; createdAt: string }>;
      message?: string;
    };
    if (!response.ok) throw new Error(result.message ?? "Gagal memuat regu.");
    setTeams((result.teams ?? []).map(({ id, name, color, score }) => ({
      id,
      name,
      color,
      score,
    })));
  }, [sessionId]);

  useEffect(() => {
    let active = true;
    fetch(teamsPath(sessionId), { credentials: "same-origin" })
      .then(async (response) => {
        const result = (await response.json()) as {
          teams?: Array<Team & { sessionId: string; createdAt: string }>;
          message?: string;
        };
        if (!response.ok) throw new Error(result.message ?? "Gagal memuat regu.");
        if (active) {
          setTeams((result.teams ?? []).map(({ id, name, color, score }) => ({
            id,
            name,
            color,
            score,
          })));
        }
      })
      .catch((reason: unknown) => {
        if (active) setNotice(reason instanceof Error ? reason.message : "Gagal memuat regu.");
      });
    return () => {
      active = false;
    };
  }, [sessionId]);

  const atMax = teams.length >= maxTeams;

  const addTeam = useCallback(async () => {
    if (teams.length >= maxTeams) {
      setNotice(`Maksimal ${maxTeams} regu. Hapus salah satu regu untuk menambah.`);
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(teamsPath(sessionId), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: nextTeamName(teams) }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Gagal menambah regu.");
      await loadTeams();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Gagal menambah regu.");
    } finally {
      setBusy(false);
    }
  }, [loadTeams, maxTeams, sessionId, teams]);

  const removeTeam = useCallback(async (id: string) => {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(teamPath(sessionId, id), {
        method: "DELETE",
        credentials: "same-origin",
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Gagal menghapus regu.");
      setOpenColorId((open) => (open === id ? null : open));
      await loadTeams();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Gagal menghapus regu.");
    } finally {
      setBusy(false);
    }
  }, [loadTeams, sessionId]);

  const saveIdentity = useCallback(async (
    id: string,
    patch: { name?: string; color?: string },
  ) => {
    setNotice(null);
    try {
      const response = await fetch(teamPath(sessionId, id), {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Gagal menyimpan identitas regu.");
      await loadTeams();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Gagal menyimpan regu.");
      await loadTeams();
    }
  }, [loadTeams, sessionId]);

  const updateName = useCallback((id: string, name: string) => {
    setTeams((current) =>
      current.map((team) => (team.id === id ? { ...team, name } : team)),
    );
  }, []);

  const updateColor = useCallback((id: string, color: string) => {
    setTeams((current) =>
      current.map((team) => (team.id === id ? { ...team, color } : team)),
    );
  }, []);

  const toggleColorPicker = useCallback((id: string) => {
    setOpenColorId((open) => (open === id ? null : id));
  }, []);

  const duplicateNames = findDuplicateNames(teams);
  const hasNameError = teams.some(
    (team) => teamNameError(team, duplicateNames) !== null,
  );
  const namedTeams = teams.filter((team) => team.name.trim().length > 0);

  return (
    <section className="relative flex min-h-dvh flex-col overflow-x-clip bg-background text-foreground">
      {/* Latar bercahaya. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(120%_110%_at_50%_-20%,color-mix(in_oklch,var(--color-primary)_16%,transparent),transparent_60%)]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-8 sm:px-8 lg:max-w-4xl">
        <header className="space-y-2">
          <Badge variant="outline" className="text-muted-foreground">
            Kelola regu sesi ini
          </Badge>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Kelola Regu
          </h1>
          <p className="text-sm text-muted-foreground">
            Atur jumlah, nama, dan warna regu peserta (maksimal {maxTeams}{" "}
            regu) sebelum lomba dimulai.
          </p>
        </header>

        {/* Ringkasan regu: jumlah dan identitas warna tiap regu. */}
        <section
          aria-label="Ringkasan regu"
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xl font-black sm:text-2xl">
              {teams.length} regu peserta
            </p>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-muted-foreground tabular-nums">
              maksimal {maxTeams}
            </span>
          </div>

          {namedTeams.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {namedTeams.map((team) => (
                <li
                  key={team.id}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 py-1 pr-3 pl-1.5 text-sm"
                >
                  <span
                    className="size-3.5 shrink-0 rounded-full"
                    style={{ backgroundColor: team.color }}
                    aria-hidden
                  />
                  <span className="max-w-40 truncate font-medium">
                    {team.name.trim()}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {hasNameError ? (
            <p className="mt-3 text-sm text-destructive" role="status">
              Ada nama regu yang kosong atau sama. Perbaiki dulu sebelum
              menyimpan.
            </p>
          ) : null}
        </section>

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
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <span className="w-5 text-center text-sm font-bold text-muted-foreground tabular-nums">
                      {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleColorPicker(team.id)}
                      aria-label={`Ubah warna ${team.name || `regu ${index + 1}`}`}
                      aria-expanded={openColorId === team.id}
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl text-base font-black text-white ring-2 ring-white/15 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:outline-none"
                      style={{ backgroundColor: team.color }}
                    >
                      {team.name.replace(/^Regu\s+/i, "").charAt(0).toUpperCase() || "?"}
                    </button>
                    <div className="min-w-0 flex-1">
                      <input
                        type="text"
                        value={team.name}
                        onChange={(event) =>
                          updateName(team.id, event.target.value)
                        }
                        onBlur={() => {
                          if (!error) void saveIdentity(team.id, { name: team.name });
                        }}
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
                  </div>

                  {openColorId === team.id ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
                      {TEAM_COLORS.map((color) => {
                        const selected =
                          color.toLowerCase() === team.color.toLowerCase();
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => {
                              updateColor(team.id, color);
                              void saveIdentity(team.id, { color });
                            }}
                            aria-label={`Pilih warna ${color}`}
                            aria-pressed={selected}
                            className="flex size-7 items-center justify-center rounded-lg ring-2 ring-transparent transition-transform hover:scale-110"
                            style={{ backgroundColor: color }}
                          >
                            {selected ? (
                              <Check className="size-4 text-white" />
                            ) : null}
                          </button>
                        );
                      })}
                      <label className="ml-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="color"
                          value={team.color}
                          onChange={(event) =>
                            updateColor(team.id, event.target.value)
                          }
                          onBlur={() => void saveIdentity(team.id, { color: team.color })}
                          aria-label="Warna kustom"
                          className="size-7 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                        />
                        Kustom
                      </label>
                    </div>
                  ) : null}
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
            disabled={atMax || busy}
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
    </section>
  );
}

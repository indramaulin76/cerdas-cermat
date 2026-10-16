"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Check, CircleHelp, LogOut, Play, RotateCcw, Timer, Trophy } from "lucide-react";

import { AnswerButton } from "@/components/team/answer-button";
import { ViewerScoreboard } from "@/components/viewer/viewer-scoreboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLiveSession } from "@/hooks/use-live-session";
import { useRoleSession } from "@/components/auth/role-gate";
import { roleAuthPath, type TeamDto } from "@/lib/ccl/api";
import type { RoleId } from "@/lib/ccl/roles";

function useClock() {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function useActionError() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const request = useCallback(async (path: string, method: string, body?: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(path, {
        method,
        credentials: "same-origin",
        ...(body === undefined
          ? {}
          : {
              headers: { "content-type": "application/json" },
              body: JSON.stringify(body),
            }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Permintaan gagal.");
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Permintaan gagal.");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  return { error, setError, busy, request };
}

function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <Badge
      variant="outline"
      className={connected ? "border-emerald-400/30 text-emerald-300" : "border-amber-400/30 text-amber-300"}
    >
      <span className={`mr-2 size-2 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`} />
      {connected ? "LIVE" : "Menyambungkan"}
    </Badge>
  );
}

function ErrorNotice({ error }: { error: string | null }) {
  return error ? <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p> : null;
}

function teamLabel(teams: TeamDto[], id: string): string {
  return teams.find((team) => team.id === id)?.name ?? id;
}

export function LiveModeratorDashboard() {
  const { sessionId } = useRoleSession();
  const live = useLiveSession(sessionId, "moderator");
  const action = useActionError();
  const now = useClock();
  const session = live.session;
  const round = live.round;
  const answerStartedAt = round?.answerStartedAt
    ? Date.parse(round.answerStartedAt)
    : null;
  const deadline = answerStartedAt !== null && session
    ? answerStartedAt + session.cooldownSeconds * 1000
    : null;
  const remainingMs = deadline === null ? null : Math.max(0, deadline - now);
  const remaining = remainingMs === null ? null : Math.ceil(remainingMs / 1000);
  const answeringTeam = live.teams.find((team) => team.id === round?.answeringTeamId);

  async function openRound() {
    await action.request(`/api/sessions/${encodeURIComponent(sessionId)}/rounds/open`, "POST", {});
  }
  async function closeRound() {
    await action.request(`/api/sessions/${encodeURIComponent(sessionId)}/rounds/reset`, "POST", {});
  }
  async function answerAction(actionName: string, extra: Record<string, unknown> = {}) {
    await action.request(`/api/sessions/${encodeURIComponent(sessionId)}/rounds/answer`, "POST", {
      action: actionName,
      ...extra,
    });
  }
  async function logout() {
    if (await action.request(roleAuthPath(sessionId, "moderator"), "DELETE")) {
      window.location.reload();
    }
  }

  const ranking = live.ranking;

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black sm:text-3xl">Dashboard Moderator</h1>
            <p className="text-sm text-muted-foreground">{session?.title ?? "Memuat sesi…"}</p>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionBadge connected={live.connected} />
            <Button variant="outline" onClick={logout}><LogOut className="size-4" aria-hidden />Keluar</Button>
          </div>
        </header>

        <ErrorNotice error={action.error ?? live.error} />
        {!session ? <p className="text-sm text-muted-foreground">Menunggu data sesi real-time…</p> : null}

        {session ? (
          <>
            <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Status soal</p>
                    <h2 className="mt-1 text-xl font-black">
                      {live.phase === "idle" ? "Standby" : live.phase === "open" ? "Siap — menunggu buzz" : live.phase === "awaiting_next" ? "Menunggu regu berikutnya" : `Giliran ${answeringTeam?.name ?? "regu"} menjawab`}
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{live.phase === "answering" ? "Sisa waktu menjawab" : "Waktu menjawab"}</p>
                    <p className="text-3xl font-black tabular-nums">{remaining === null ? "—" : `${remaining}s`}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" disabled>
                    Standby
                  </Button>
                  <Button onClick={openRound} disabled={action.busy || session.status !== "active" || live.phase !== "idle"}>
                    <Play className="size-4" aria-hidden />Siap
                  </Button>
                  <Button variant="secondary" onClick={closeRound} disabled={action.busy || live.phase === "idle"}>
                    <RotateCcw className="size-4" aria-hidden />Ulangi / Reset
                  </Button>
                </div>
                {live.phase === "answering" && remaining === 0 ? (
                  <p role="status" className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">
                    Waktu habis. Regu tetap mendapat giliran sampai moderator mencatat hasil atau memilih regu lain.
                  </p>
                ) : null}
                {session.status !== "active" ? (
                  <p className="text-xs text-amber-200">Sesi belum berstatus berlangsung. Admin perlu mengaktifkan sesi terlebih dahulu.</p>
                ) : null}
                <div className="flex items-center gap-2 border-t border-white/10 pt-3 text-sm text-muted-foreground">
                  <Timer className="size-4" aria-hidden />
                  Durasi menjawab {session.cooldownSeconds} detik · diatur panitia
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <Trophy className="size-5 text-amber-300" aria-hidden />
                  <h2 className="text-lg font-bold">Urutan jawab</h2>
                </div>
                {ranking.length ? (
                  <ol className="mt-3 space-y-2">
                    {ranking.map((event, index) => (
                      <li key={event.id}>
                        <button
                          type="button"
                          disabled={action.busy || event.answerStatus !== null || live.phase === "idle" || round?.answeringTeamId === event.teamId}
                          onClick={() => void answerAction("select", { teamId: event.teamId })}
                          className={`flex w-full items-center justify-between rounded-xl border p-3 text-left disabled:cursor-not-allowed disabled:opacity-60 ${round?.answeringTeamId === event.teamId ? "border-fuchsia-300/50 bg-fuchsia-300/10" : index === 0 ? "border-amber-300/40 bg-amber-300/10" : "border-white/10 bg-black/10"}`}
                        >
                          <span className="flex items-center gap-3">
                            <span className="grid size-7 place-items-center rounded-lg bg-white/10 text-sm font-bold">{index + 1}</span>
                            <span className="font-semibold">{teamLabel(live.teams, event.teamId)}</span>
                            {event.answerStatus ? <span className="text-xs uppercase text-muted-foreground">{event.answerStatus === "wrong" ? "Salah" : event.answerStatus === "timeout" ? "Waktu habis" : "Benar"}</span> : null}
                          </span>
                          <span className="font-mono text-sm tabular-nums">{event.reactionMs} ms</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : <p className="mt-4 text-sm text-muted-foreground">Belum ada regu yang menekan.</p>}
                {live.phase === "answering" && answeringTeam ? (
                  <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                    <p className="font-bold">Giliran: {answeringTeam.name}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button disabled={action.busy} onClick={() => void answerAction("correct")}>Benar +100</Button>
                      {[100, 75, 50].map((penalty) => (
                        <Button key={penalty} variant="outline" disabled={action.busy} onClick={() => void answerAction("wrong", { penalty })}>
                          Salah −{penalty}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {live.phase === "awaiting_next" ? (
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <Button disabled={action.busy || !ranking.some((event) => event.answerStatus === null)} onClick={() => void answerAction("next")}>
                      Regu berikutnya
                    </Button>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
              <h2 className="mb-3 text-lg font-bold">Papan skor</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[...live.teams].sort((a, b) => b.score - a.score).map((team) => (
                  <div key={team.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 p-3">
                    <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: team.color }} />
                    <span className="min-w-0 flex-1 truncate font-semibold">{team.name}</span>
                    <span className="font-black tabular-nums">{team.score}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

export function LiveViewerDashboard() {
  const { sessionId } = useRoleSession();
  const live = useLiveSession(sessionId, "viewer");
  const now = useClock();
  const answerStartedAt = live.round?.answerStartedAt
    ? Date.parse(live.round.answerStartedAt)
    : null;
  const answerRemainingMs =
    answerStartedAt === null || !live.session
      ? null
      : Math.max(
          0,
          answerStartedAt + live.session.cooldownSeconds * 1000 - now,
        );
  const answeringTeam = live.teams.find(
    (team) => team.id === live.round?.answeringTeamId,
  );
  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-7xl flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-fuchsia-300">Cerdas Cermat Live</p>
            <h1 className="text-2xl font-black sm:text-4xl">{live.session?.title ?? "Memuat sesi…"}</h1>
          </div>
          <ConnectionBadge connected={live.connected} />
        </header>
        <ErrorNotice error={live.error} />
        <div aria-live="polite" className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center">
          {live.highlightTeamId ? (
            <p className="text-lg font-black sm:text-2xl">⚡ {teamLabel(live.teams, live.highlightTeamId)} paling cepat menjawab!</p>
          ) : <p className="text-sm text-muted-foreground">Menunggu regu menekan tombol jawab…</p>}
        </div>
        {live.phase === "answering" && answerRemainingMs !== null && live.session ? (
          <section
            aria-live="polite"
            className="rounded-3xl border border-fuchsia-300/25 bg-gradient-to-br from-fuchsia-400/10 to-cyan-400/10 p-5 text-center sm:p-8"
          >
            <p className="text-sm font-bold uppercase tracking-widest text-fuchsia-200">
              Giliran menjawab
            </p>
            <p className="mt-2 text-xl font-black sm:text-3xl">
              {answeringTeam?.name ?? "Regu"}
            </p>
            <p className={`my-3 text-6xl font-black tabular-nums sm:text-8xl ${answerRemainingMs < 3000 ? "animate-pulse text-rose-300" : "text-foreground"}`}>
              {Math.ceil(answerRemainingMs / 1000)}
              <span className="ml-2 text-2xl sm:text-4xl">detik</span>
            </p>
            <div className="mx-auto h-3 max-w-3xl overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-cyan-300 transition-[width] duration-100 ease-linear"
                style={{
                  width: `${Math.max(0, answerRemainingMs / (live.session.cooldownSeconds * 1000)) * 100}%`,
                }}
              />
            </div>
          </section>
        ) : live.phase === "open" ? (
          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/5 p-4 text-center font-semibold text-emerald-200">
            Siap — regu sedang menekan tombol buzz
          </div>
        ) : live.phase === "awaiting_next" ? (
          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-center font-semibold text-amber-100">
            Menunggu giliran regu berikutnya
          </div>
        ) : null}
        <section className="flex flex-1 flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-2xl font-black sm:text-4xl">Papan Skor</h2>
            <span className="text-sm text-muted-foreground">{live.teams.length} regu</span>
          </div>
          <ViewerScoreboard
            teams={live.teams.map(({ id, name, color, score }) => ({ id, name, color, score }))}
            highlightTeamId={live.highlightTeamId}
          />
        </section>
        {live.session ? (
          <footer className="flex flex-wrap justify-between gap-2 border-t border-white/10 pt-3 text-xs text-muted-foreground">
            <span>Waktu jawab {live.session.cooldownSeconds} detik</span>
            <span>Benar +100 · Salah −50 / −75 / −100</span>
          </footer>
        ) : null}
      </div>
    </main>
  );
}

const subscribeTeamQuery = (listener: () => void) => {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
};
const readTeamQuery = () =>
  new URLSearchParams(window.location.search).get("team") ?? "";

export function LiveTeamDashboard() {
  const { sessionId } = useRoleSession();
  const live = useLiveSession(sessionId, "team");
  const now = useClock();
  const queryTeamId = useSyncExternalStore(subscribeTeamQuery, readTeamQuery, () => "");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const teamId = selectedTeamId || queryTeamId;
  const team = live.teams.find((item) => item.id === teamId);
  const ranking = live.ranking;
  const ownBuzz = ranking.find((item) => item.teamId === teamId);
  const cooldownSeconds = live.session?.cooldownSeconds ?? 10;
  const answerStartedAt = live.round?.answerStartedAt
    ? Date.parse(live.round.answerStartedAt)
    : null;
  const remainingMs = answerStartedAt === null
    ? null
    : Math.max(0, answerStartedAt + cooldownSeconds * 1000 - now);
  const isOpen = live.phase === "open" && !ownBuzz;
  const answeringTeamName = teamLabel(live.teams, live.round?.answeringTeamId ?? "");

  async function buzz() {
    if (!team || !live.round || !isOpen || pending || ownBuzz) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/buzz`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teamId: team.id, roundId: live.round.id }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Tekanan tidak tercatat.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Tekanan tidak tercatat.");
    } finally {
      setPending(false);
    }
  }

  if (!team) {
    return (
      <main className="min-h-dvh bg-background px-5 py-8 text-foreground">
        <div className="mx-auto max-w-xl">
          <header className="mb-5">
            <h1 className="text-2xl font-black">Pilih regu</h1>
            <p className="mt-1 text-sm text-muted-foreground">{live.session?.title ?? "Memuat sesi…"}</p>
          </header>
          <ErrorNotice error={live.error ?? error} />
          <div className="grid gap-3 sm:grid-cols-2">
            {live.teams.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedTeamId(item.id);
                  const url = new URL(window.location.href);
                  url.searchParams.set("team", item.id);
                  window.history.replaceState(null, "", url);
                  window.dispatchEvent(new PopStateEvent("popstate"));
                }}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left hover:bg-white/[0.08]"
              >
                <span className="size-4 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="font-bold">{item.name}</span>
              </button>
            ))}
          </div>
          {live.teams.length === 0 && !live.error ? <p className="mt-4 text-sm text-muted-foreground">Admin belum menambahkan regu pada sesi ini.</p> : null}
        </div>
      </main>
    );
  }

  const visual = ownBuzz?.answerStatus === "timeout"
    ? "timeout"
    : ownBuzz?.answerStatus === "correct" || (ownBuzz?.isFirst && live.phase === "idle")
      ? "won"
      : ownBuzz || live.phase === "answering" || live.phase === "awaiting_next"
        ? "locked"
        : isOpen ? "armed" : "waiting";
  const label = ownBuzz
    ? ownBuzz.answerStatus === "wrong" ? "JAWABAN SALAH"
      : ownBuzz.answerStatus === "timeout" ? "WAKTU HABIS"
        : ownBuzz.answerStatus === "correct" ? "JAWABAN BENAR"
          : live.round?.answeringTeamId === teamId ? "GILIRANMU"
            : ownBuzz.isFirst ? "BUZZ TERCATAT" : "TERKUNCI"
    : isOpen ? "TEKAN!" : "SIAP MENUNGGU";
  const sublabel = ownBuzz
    ? ownBuzz.answerStatus ? `Urutan buzz ${ranking.findIndex((item) => item.teamId === teamId) + 1} · ${ownBuzz.answerStatus === "wrong" ? "belum benar" : ownBuzz.answerStatus === "timeout" ? "waktu habis" : "poin +100"}`
      : `Tercatat ${ownBuzz.reactionMs} ms · urutan ${ranking.findIndex((item) => item.teamId === teamId) + 1}`
    : isOpen ? "Tekan satu kali untuk masuk urutan jawab"
      : live.phase === "answering" ? `${answeringTeamName} sedang menjawab`
        : live.phase === "awaiting_next" ? "Menunggu moderator memilih regu berikutnya"
          : "Menunggu moderator menekan Siap";

  return (
    <main className="relative flex min-h-dvh flex-col bg-background px-5 py-5 text-foreground">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5">
        <header className="flex items-center justify-between gap-3">
          <div><p className="text-sm font-bold">Cerdas Cermat Live</p><p className="text-xs text-muted-foreground">{live.session?.title}</p></div>
          <ConnectionBadge connected={live.connected} />
        </header>
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-3">
            <span className="size-4 rounded-full" style={{ backgroundColor: team.color }} />
            <span className="font-bold">{team.name}</span>
          </div>
          <button type="button" onClick={() => {
            setSelectedTeamId("");
            const url = new URL(window.location.href);
            url.searchParams.delete("team");
            window.history.replaceState(null, "", url);
            window.dispatchEvent(new PopStateEvent("popstate"));
          }} className="text-xs text-muted-foreground underline">Ganti regu</button>
        </div>
        {live.phase === "answering" && remainingMs !== null ? (
          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
            <p className="text-sm font-semibold">{answeringTeamName} sedang menjawab</p>
            <p className="my-2 text-4xl font-black tabular-nums">{Math.ceil(remainingMs / 1000)}s</p>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full transition-[width] duration-100"
                style={{
                  width: `${Math.max(0, remainingMs / (cooldownSeconds * 1000)) * 100}%`,
                  backgroundColor: team.color,
                }}
              />
            </div>
          </section>
        ) : null}
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <AnswerButton
            visual={visual}
            color={team.color}
            label={pending ? "TERKIRIM…" : label}
            sublabel={sublabel}
            onPress={buzz}
            ariaLabel={isOpen ? `Tekan tombol jawab untuk ${team.name}` : `Tombol jawab ${team.name} belum aktif`}
          />
          {isOpen ? <p className="text-sm text-muted-foreground">Tombol regu lain masih dapat ditekan sampai moderator memilih penjawab.</p> : null}
        </div>
        <ErrorNotice error={error ?? live.error} />
        {ownBuzz ? <p className="text-center text-sm font-semibold text-emerald-300"><Check className="mr-1 inline size-4" aria-hidden />{ownBuzz.isFirst ? "Tekananmu tercatat paling cepat." : "Tekananmu tercatat."}</p> : null}
        {(live.phase === "answering" || live.phase === "awaiting_next") && !ownBuzz ? <p className="text-center text-sm text-muted-foreground"><CircleHelp className="mr-1 inline size-4" aria-hidden />{answeringTeamName} sedang mendapat giliran.</p> : null}
      </div>
    </main>
  );
}

export function SessionRolePage({ role }: { role: RoleId }) {
  const Component =
    role === "moderator" ? LiveModeratorDashboard
      : role === "viewer" ? LiveViewerDashboard
        : LiveTeamDashboard;
  return <Component />;
}

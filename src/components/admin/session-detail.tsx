"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Copy,
  KeyRound,
  LayoutDashboard,
  MonitorPlay,
  Smartphone,
  Users,
  type LucideIcon,
} from "lucide-react";

import { SettingsForm } from "@/components/admin/settings-form";
import { TeamManager } from "@/components/admin/team-manager";
import { Button } from "@/components/ui/button";
import type { SessionDetailDto, TeamDto } from "@/lib/ccl/api";
import { readApiResponse, sessionDetailPath, teamsPath } from "@/lib/ccl/api";
import { ROLE_INFO, ROLE_ORDER, type RoleId } from "@/lib/ccl/roles";
import { formatSessionDate } from "@/lib/ccl/format";
import { SESSION_STATUS_CLASS, SESSION_STATUS_LABEL } from "@/lib/ccl/session-status";
import { useCopyToClipboard } from "@/lib/ccl/use-copy";

const ROLE_ICON: Record<RoleId, LucideIcon> = {
  moderator: LayoutDashboard,
  viewer: MonitorPlay,
  team: Smartphone,
};
const subscribeToOrigin = () => () => {};
const getBrowserOrigin = () => window.location.origin;

export function SessionDetail({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<SessionDetailDto | null>(null);
  const [teams, setTeams] = useState<TeamDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { copy, feedback } = useCopyToClipboard();
  const origin = useSyncExternalStore(subscribeToOrigin, getBrowserOrigin, () => "");

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(sessionDetailPath(sessionId), { credentials: "same-origin" }),
      fetch(teamsPath(sessionId), { credentials: "same-origin" }),
    ])
      .then(async ([sessionResponse, teamsResponse]) => {
        const sessionResult = await readApiResponse<{
          session?: SessionDetailDto;
          message?: string;
        }>(sessionResponse, "Gagal memuat sesi.");
        const teamsResult = await readApiResponse<{
          teams?: TeamDto[];
          message?: string;
        }>(teamsResponse, "Gagal memuat regu.");
        if (!sessionResponse.ok) throw new Error(sessionResult.message ?? "Gagal memuat sesi.");
        if (!teamsResponse.ok) throw new Error(teamsResult.message ?? "Gagal memuat regu.");
        if (active) {
          setSession(sessionResult.session ?? null);
          setTeams(teamsResult.teams ?? []);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Gagal memuat sesi.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sessionId]);

  async function updateStatus(status: SessionDetailDto["status"]) {
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(sessionDetailPath(sessionId), {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await readApiResponse<{
        session?: SessionDetailDto;
        message?: string;
      }>(response, "Gagal mengubah status sesi.");
      if (!response.ok || !result.session) throw new Error(result.message ?? "Gagal mengubah status sesi.");
      setSession(result.session);
      setNotice("Status sesi diperbarui.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal mengubah status sesi.");
    }
  }

  if (loading) {
    return <main className="grid min-h-dvh place-items-center text-sm text-muted-foreground">Memuat sesi…</main>;
  }
  if (error && !session) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center gap-4 px-5 text-foreground">
        <p role="alert" className="text-sm text-destructive">{error}</p>
        <Link href="/sesi" className="text-sm underline">Kembali ke daftar sesi</Link>
      </main>
    );
  }
  if (!session) return null;

  return (
    <main className="relative flex min-h-dvh flex-col bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-7 px-5 py-8 sm:px-8">
        <Link href="/sesi" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />Semua sesi
        </Link>

        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black sm:text-3xl">{session.title}</h1>
            <span className={`rounded-full border px-2.5 py-1 text-xs ${SESSION_STATUS_CLASS[session.status]}`}>
              {SESSION_STATUS_LABEL[session.status]}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Users className="size-3.5" aria-hidden />{teams.length} regu</span>
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" aria-hidden />Dibuat {formatSessionDate(session.createdAt)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {session.status === "draft" ? <Button type="button" onClick={() => updateStatus("active")}>Aktifkan lomba</Button> : null}
            {session.status === "active" ? <Button type="button" variant="outline" onClick={() => updateStatus("finished")}>Selesaikan lomba</Button> : null}
            {session.status === "finished" ? <Button type="button" variant="outline" onClick={() => updateStatus("draft")}>Kembalikan ke draft</Button> : null}
          </div>
          {notice ? <p role="status" className="text-sm text-emerald-300">{notice}</p> : null}
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        </header>

        <section aria-label="Tautan dan PIN akses" className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Bagikan akses peran</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {ROLE_ORDER.map((role) => {
              const Icon = ROLE_ICON[role];
              const info = ROLE_INFO[role];
              const path = session.links[role];
              const copied = feedback?.key === `${role}:all` && feedback.status === "copied";
              return (
                <article key={role} className={`flex flex-col gap-4 rounded-2xl border p-4 ${info.accent.card}`}>
                  <div className="flex items-center gap-3">
                    <span className={`grid size-10 place-items-center rounded-xl ${info.accent.badge}`}><Icon className="size-5" aria-hidden /></span>
                    <div><h3 className="font-bold">{info.label}</h3><p className="text-xs text-muted-foreground">{info.description}</p></div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">Link</span>
                    <p className="rounded-lg border border-white/10 bg-black/20 p-2 font-mono text-xs break-all">{origin}{path}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"><KeyRound className="size-3.5" aria-hidden />PIN</span>
                    <span className="font-mono text-2xl font-black tracking-[0.3em]">{session.pins[role]}</span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-auto"
                    onClick={() => void copy(`${info.label}\nLink: ${window.location.origin}${path}\nPIN: ${session.pins[role]}`, `${role}:all`)}
                  >
                    {copied ? <><Check className="size-4" aria-hidden />Tersalin</> : <><Copy className="size-4" aria-hidden />Salin link &amp; PIN</>}
                  </Button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black">Regu peserta</h2>
          <TeamManager
            key={session.id}
            sessionId={session.id}
            initialTeams={teams.map(({ id, name, color, score }) => ({ id, name, color, score }))}
            maxTeams={10}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black">Aturan lomba</h2>
          <SettingsForm
            sessionId={session.id}
            sessionTitle={session.title}
            settings={{
              cooldownSeconds: session.cooldownSeconds,
              correctPoints: session.correctPoints,
              wrongPoints: session.wrongPoints,
            }}
          />
        </section>
      </div>
    </main>
  );
}

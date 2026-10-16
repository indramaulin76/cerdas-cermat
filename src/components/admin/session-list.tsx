"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { SessionStatus, SessionSummary } from "@/lib/ccl/types";

/**
 * Halaman daftar sesi untuk admin.
 *
 * Menampilkan semua sesi lomba milik admin beserta status, jumlah regu, dan
 * waktu pembuatannya. Membuat sesi baru dan detail link menyusul di task
 * berikutnya; tahap ini memakai data tiruan.
 */

/** Label status sesi dalam bahasa Indonesia. */
const STATUS_LABEL: Record<SessionStatus, string> = {
  draft: "Belum dimulai",
  active: "Berlangsung",
  finished: "Selesai",
};

/** Kelas warna badge per status. */
const STATUS_CLASS: Record<SessionStatus, string> = {
  draft: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  active: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  finished: "border-white/15 bg-white/5 text-muted-foreground",
};

/** Format tanggal dibuat secara deterministik (zona waktu tetap). */
function formatCreatedAt(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

export function SessionList({
  initialSessions,
}: {
  initialSessions: SessionSummary[];
}) {
  const sessions = [...initialSessions].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );

  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-clip bg-background text-foreground">
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
            Fase 3 · data tiruan
          </Badge>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Sesi &amp; Link
          </h1>
          <p className="text-sm text-muted-foreground">
            Semua sesi lomba yang kamu buat. Buka satu sesi untuk melihat link
            dan PIN tiap peran.
          </p>
        </header>

        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 px-5 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada sesi. Buat sesi lomba untuk memulai.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {sessions.map((session) => (
              <li key={session.id}>
                <Link
                  href={`/sesi/${encodeURIComponent(session.id)}`}
                  className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur transition-colors hover:border-white/20 hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-fuchsia-400/60 focus-visible:outline-none sm:p-5"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-bold sm:text-lg">
                        {session.title}
                      </h2>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[session.status]}`}
                      >
                        {STATUS_LABEL[session.status]}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="size-3.5" aria-hidden />
                        {session.teamCount} regu
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" aria-hidden />
                        Dibuat {formatCreatedAt(session.createdAt)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

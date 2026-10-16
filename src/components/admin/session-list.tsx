"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight, Plus, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SessionStatus, SessionSummary } from "@/lib/ccl/types";

/**
 * Halaman daftar sesi untuk admin.
 *
 * Menampilkan semua sesi lomba milik admin beserta status, jumlah regu, dan
 * waktu pembuatannya, serta form untuk membuat sesi baru (data tiruan). Sesi
 * baru langsung muncul di daftar dengan status "belum dimulai" (draft).
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

/** Id sesi baru yang aman untuk URL, dari nama acara + akhiran acak. */
function newSessionId(title: string): string {
  const slug =
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "sesi";
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 6)
      : Math.random().toString(36).slice(2, 8);
  return `${slug}-${suffix}`;
}

/** Urutkan sesi dari yang terbaru. */
function sortSessions(sessions: SessionSummary[]): SessionSummary[] {
  return [...sessions].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

export function SessionList({
  initialSessions,
}: {
  initialSessions: SessionSummary[];
}) {
  const [sessions, setSessions] = useState<SessionSummary[]>(() =>
    sortSessions(initialSessions),
  );
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const resetForm = () => {
    setTitle("");
    setError(null);
  };

  const openForm = () => {
    setNotice(null);
    setError(null);
    setShowForm(true);
  };

  const cancelForm = () => {
    resetForm();
    setShowForm(false);
  };

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = title.trim();
    if (!trimmed) {
      setError("Nama acara wajib diisi.");
      return;
    }
    if (trimmed.length > 80) {
      setError("Nama acara terlalu panjang (maksimal 80 karakter).");
      return;
    }

    const session: SessionSummary = {
      id: newSessionId(trimmed),
      title: trimmed,
      // Sesi baru selalu mulai sebagai draft sampai admin mengaktifkannya.
      status: "draft",
      createdAt: new Date().toISOString(),
      teamCount: 0,
    };

    setSessions((current) => sortSessions([session, ...current]));
    setShowForm(false);
    resetForm();
    setNotice(`Sesi "${trimmed}" berhasil dibuat.`);
  };

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
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <Badge variant="outline" className="text-muted-foreground">
              Fase 3 · data tiruan
            </Badge>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Sesi &amp; Link
            </h1>
            <p className="max-w-prose text-sm text-muted-foreground">
              Semua sesi lomba yang kamu buat. Buka satu sesi untuk melihat link
              dan PIN tiap peran.
            </p>
          </div>
          <Button
            type="button"
            onClick={openForm}
            disabled={showForm}
            className="h-10"
          >
            <Plus />
            Buat Sesi
          </Button>
        </header>

        {showForm ? (
          <form
            onSubmit={handleCreate}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur sm:p-5"
          >
            <label
              htmlFor="session-title"
              className="text-sm font-semibold"
            >
              Nama acara
            </label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Mis. &ldquo;Cerdas Cermat Live — Babak Penyisihan&rdquo;.
            </p>
            <input
              id="session-title"
              type="text"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (error) setError(null);
              }}
              autoFocus
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "session-title-error" : undefined}
              placeholder="Nama acara lomba"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:border-fuchsia-400 focus-visible:ring-2 focus-visible:ring-fuchsia-400/30 aria-invalid:border-destructive"
            />
            {error ? (
              <p
                id="session-title-error"
                className="mt-1 text-xs text-destructive"
              >
                {error}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="submit">Buat Sesi</Button>
              <Button type="button" variant="outline" onClick={cancelForm}>
                Batal
              </Button>
            </div>
          </form>
        ) : null}

        <p
          role="status"
          aria-live="polite"
          className="min-h-5 text-sm text-muted-foreground"
        >
          {notice}
        </p>

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

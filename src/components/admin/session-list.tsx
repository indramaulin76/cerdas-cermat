"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronRight, Plus, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SESSION_STATUS_CLASS, SESSION_STATUS_LABEL } from "@/lib/ccl/session-status";
import type { SessionSummaryDto } from "@/lib/ccl/api";
import { sessionsPath } from "@/lib/ccl/api";
import { formatSessionDate } from "@/lib/ccl/format";

export function SessionList() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(sessionsPath(), { credentials: "same-origin" })
      .then(async (response) => {
        const result = (await response.json()) as {
          sessions?: SessionSummaryDto[];
          message?: string;
        };
        if (!response.ok) throw new Error(result.message ?? "Gagal memuat daftar sesi.");
        if (active) setSessions(result.sessions ?? []);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Gagal memuat daftar sesi.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function createSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(sessionsPath(), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const result = (await response.json()) as {
        session?: { id: string };
        message?: string;
      };
      if (!response.ok || !result.session) {
        throw new Error(result.message ?? "Gagal membuat sesi.");
      }
      router.push(`/sesi/${encodeURIComponent(result.session.id)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal membuat sesi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh flex-col bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-5 py-8 sm:px-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <Badge variant="outline" className="text-muted-foreground">Sesi tersimpan</Badge>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Sesi &amp; Link</h1>
            <p className="max-w-prose text-sm text-muted-foreground">
              Buat sesi, kelola regu dan pengaturan, lalu bagikan link serta PIN tiap peran.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowForm((value) => !value);
              setError(null);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-bold text-background"
          >
            <Plus className="size-4" aria-hidden />
            Buat Sesi
          </button>
        </header>

        {showForm ? (
          <form onSubmit={createSession} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <label htmlFor="session-title" className="block text-sm font-semibold">Nama acara</label>
            <input
              id="session-title"
              autoFocus
              required
              maxLength={80}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Contoh: Babak Penyisihan"
              className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60"
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className="rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background disabled:opacity-50">
                {busy ? "Membuat…" : "Buat sesi"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-white/10 px-4 py-2 text-sm">Batal</button>
            </div>
          </form>
        ) : null}

        {error ? (
          <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200">
            {error} {error.includes("Masuk") || error.includes("panitia") ? <Link href="/" className="underline">Kembali ke login</Link> : null}
          </div>
        ) : null}

        {loading ? <p className="text-sm text-muted-foreground">Memuat daftar sesi…</p> : null}
        {!loading && sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-muted-foreground">
            Belum ada sesi tersimpan. Buat sesi pertama untuk memulai.
          </div>
        ) : (
          <ul className="grid gap-3">
            {sessions.map((session) => (
              <li key={session.id}>
                <Link href={`/sesi/${encodeURIComponent(session.id)}`} className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-white/20 hover:bg-white/[0.07] sm:p-5">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-bold">{session.title}</h2>
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs ${SESSION_STATUS_CLASS[session.status]}`}>
                        {SESSION_STATUS_LABEL[session.status]}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5"><Users className="size-3.5" aria-hidden />{session.teamCount} regu</span>
                      <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" aria-hidden />{formatSessionDate(session.createdAt)}</span>
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

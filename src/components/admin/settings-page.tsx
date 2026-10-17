"use client";

import { useEffect, useState } from "react";

import { SettingsForm } from "@/components/admin/settings-form";
import type { SessionDetailDto, SessionSummaryDto } from "@/lib/ccl/api";
import { readApiResponse, sessionDetailPath, sessionsPath } from "@/lib/ccl/api";

export function SettingsPage() {
  const [sessions, setSessions] = useState<SessionSummaryDto[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<SessionDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(sessionsPath(), { credentials: "same-origin" })
      .then(async (response) => {
        const result = await readApiResponse<{
          sessions?: SessionSummaryDto[];
          message?: string;
        }>(response, "Gagal memuat sesi.");
        if (!response.ok) throw new Error(result.message ?? "Gagal memuat sesi.");
        if (!active) return;
        const items = result.sessions ?? [];
        setSessions(items);
        const fromUrl = new URLSearchParams(window.location.search).get("session");
        setSelectedId(fromUrl && items.some((item) => item.id === fromUrl) ? fromUrl : items[0]?.id ?? "");
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Gagal memuat sesi.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    fetch(sessionDetailPath(selectedId), { credentials: "same-origin" })
      .then(async (response) => {
        const result = await readApiResponse<{
          session?: SessionDetailDto;
          message?: string;
        }>(response, "Gagal memuat pengaturan sesi.");
        if (!response.ok || !result.session) {
          throw new Error(result.message ?? "Gagal memuat pengaturan sesi.");
        }
        if (active) setDetail(result.session);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Gagal memuat pengaturan.");
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-6 px-5 py-8 text-foreground sm:px-8">
      <header>
        <h1 className="text-2xl font-black sm:text-3xl">Pengaturan Lomba</h1>
        <p className="mt-2 text-sm text-muted-foreground">Pengaturan yang disimpan dipakai pada sesi berikutnya sebagai nilai awal.</p>
      </header>
      <label className="block max-w-xl space-y-2 text-sm font-semibold">
        <span>Pilih sesi</span>
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-card px-3">
          <option value="">Pilih sesi lomba</option>
          {sessions.map((session) => <option key={session.id} value={session.id}>{session.title}</option>)}
        </select>
      </label>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {detail?.id === selectedId ? (
        <SettingsForm
          key={detail.id}
          sessionId={detail.id}
          sessionTitle={detail.title}
          settings={{
            cooldownSeconds: detail.cooldownSeconds,
            correctPoints: detail.correctPoints,
            wrongPoints: detail.wrongPoints,
          }}
        />
      ) : sessions.length === 0 && !error ? (
        <p className="text-sm text-muted-foreground">Belum ada sesi. Buat sesi dulu melalui menu Sesi &amp; Link.</p>
      ) : null}
    </main>
  );
}

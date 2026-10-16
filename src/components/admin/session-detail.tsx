"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatSessionDate } from "@/lib/ccl/format";
import { ROLE_INFO, type RoleId } from "@/lib/ccl/roles";
import {
  SESSION_STATUS_CLASS,
  SESSION_STATUS_LABEL,
} from "@/lib/ccl/session-status";
import { type CopyFeedback, useCopyToClipboard } from "@/lib/ccl/use-copy";
import {
  getCreatedSession,
  subscribeCreatedSessions,
} from "@/lib/mock/session-store";
import {
  buildMockSessionDetail,
  type SessionDetail as SessionDetailData,
} from "@/lib/mock/sessions";

/**
 * Halaman detail sesi untuk admin.
 *
 * Menampilkan tiga link akses (moderator, layar penonton, HP regu) beserta PIN
 * masing-masing dalam satu tampilan, siap dibagikan. Sesi yang dibuat admin
 * (tersimpan di localStorage) juga bisa dibuka di sini.
 */

const noopSubscribe = () => () => {};

/** Alamat asal situs di klien (kosong saat SSR) untuk menampilkan link utuh. */
function useOrigin(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  );
}

/** Apakah komponen sudah berjalan di klien (false saat SSR). */
function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** Ikon tiap peran agar tidak tertukar (warna aksen dari ROLE_INFO). */
const ROLE_ICON: Record<RoleId, LucideIcon> = {
  moderator: LayoutDashboard,
  viewer: MonitorPlay,
  team: Smartphone,
};

/** Tombol ikon untuk menyalin satu nilai (link atau PIN). */
function CopyIconButton({
  label,
  copied,
  onCopy,
}: {
  label: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={onCopy}
      className={copied ? "text-emerald-300" : "text-muted-foreground"}
    >
      {copied ? (
        <Check className="size-4" aria-hidden />
      ) : (
        <Copy className="size-4" aria-hidden />
      )}
    </Button>
  );
}

function RoleCard({
  role,
  origin,
  copy,
  feedback,
}: {
  role: SessionDetailData["roles"][number];
  origin: string;
  copy: (text: string, key: string) => void;
  feedback: CopyFeedback | null;
}) {
  const info = ROLE_INFO[role.role];
  const Icon = ROLE_ICON[role.role];
  const url = origin ? `${origin}${role.path}` : role.path;

  const linkKey = `${role.role}:link`;
  const pinKey = `${role.role}:pin`;
  const allKey = `${role.role}:all`;

  const linkCopied = feedback?.key === linkKey && feedback.status === "copied";
  const pinCopied = feedback?.key === pinKey && feedback.status === "copied";
  const allState = feedback?.key === allKey ? feedback.status : null;

  const combined = `${role.label}\nLink: ${url}\nPIN: ${role.pin}`;

  return (
    <div
      className={`flex h-full flex-col gap-4 rounded-2xl border p-4 backdrop-blur transition-colors sm:p-5 ${info.accent.card}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl ${info.accent.badge}`}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold">{role.label}</h2>
          <p className="text-xs leading-snug text-muted-foreground">
            {role.description}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Link
        </span>
        <div className="flex items-center gap-1">
          <p className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 font-mono text-xs leading-relaxed break-all text-foreground/90">
            {url}
          </p>
          <CopyIconButton
            label={`Salin link ${role.label}`}
            copied={linkCopied}
            onCopy={() => copy(url, linkKey)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <KeyRound className="size-3.5" aria-hidden />
          PIN
        </span>
        <div className="flex items-center justify-between gap-1">
          <p className="font-mono text-2xl font-black tracking-[0.25em] tabular-nums sm:text-3xl sm:tracking-[0.35em]">
            {role.pin}
          </p>
          <CopyIconButton
            label={`Salin PIN ${role.label}`}
            copied={pinCopied}
            onCopy={() => copy(role.pin, pinKey)}
          />
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        className="mt-auto h-9 w-full"
        onClick={() => copy(combined, allKey)}
      >
        {allState === "copied" ? (
          <>
            <Check className="size-4" aria-hidden />
            Tersalin
          </>
        ) : allState === "error" ? (
          <>Gagal menyalin</>
        ) : (
          <>
            <Copy className="size-4" aria-hidden />
            Salin link &amp; PIN
          </>
        )}
      </Button>
    </div>
  );
}

export function SessionDetail({
  sessionId,
  initialDetail,
}: {
  sessionId: string;
  initialDetail: SessionDetailData | null;
}) {
  const origin = useOrigin();
  const isClient = useIsClient();
  const { copy, feedback } = useCopyToClipboard();
  // Sesi buatan admin hanya ada di localStorage; baca dengan aman saat hidrasi.
  const stored = useSyncExternalStore(
    subscribeCreatedSessions,
    () => getCreatedSession(sessionId),
    () => null,
  );

  const detail =
    initialDetail ?? (stored ? buildMockSessionDetail(stored) : null);
  const ready = detail !== null || isClient;

  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-clip bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(120%_110%_at_50%_-20%,color-mix(in_oklch,var(--color-primary)_16%,transparent),transparent_60%)]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-5 py-8 sm:px-8 sm:py-10">
        <Link
          href="/sesi"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Semua sesi
        </Link>

        {!ready ? (
          <p className="text-sm text-muted-foreground">Memuat sesi…</p>
        ) : !detail ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 px-5 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Sesi tidak ditemukan atau sudah dihapus.
            </p>
            <Link
              href="/sesi"
              className="mt-3 inline-block text-sm font-semibold text-fuchsia-300 hover:underline"
            >
              Kembali ke daftar sesi
            </Link>
          </div>
        ) : (
          <>
            <header className="space-y-3">
              <Badge variant="outline" className="text-muted-foreground">
                Fase 3 · data tiruan
              </Badge>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="text-2xl font-black tracking-tight break-words sm:text-3xl">
                  {detail.session.title}
                </h1>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${SESSION_STATUS_CLASS[detail.session.status]}`}
                >
                  {SESSION_STATUS_LABEL[detail.session.status]}
                </span>
              </div>
              <p className="max-w-prose text-sm text-muted-foreground">
                Bagikan link berikut ke tiap peran. Tiap link hanya bisa dibuka
                dengan PIN-nya masing-masing.
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-3.5" aria-hidden />
                  {detail.session.teamCount} regu
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" aria-hidden />
                  Dibuat {formatSessionDate(detail.session.createdAt)}
                </span>
              </div>
            </header>

            <section aria-label="Link dan PIN tiap peran" className="space-y-3">
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Bagikan akses
              </h2>
              <div className="grid items-stretch gap-4 sm:gap-5 md:grid-cols-3">
                {detail.roles.map((role) => (
                  <RoleCard
                    key={role.role}
                    role={role}
                    origin={origin}
                    copy={copy}
                    feedback={feedback}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Link dan PIN tetap sama tiap kali kamu membuka sesi ini, jadi
                aman untuk dibagikan dan disimpan.
              </p>
            </section>

            {/* Konfirmasi salin untuk pembaca layar. */}
            <p aria-live="polite" className="sr-only">
              {feedback
                ? feedback.status === "copied"
                  ? "Tersalin ke papan klip."
                  : "Gagal menyalin."
                : ""}
            </p>
          </>
        )}
      </div>
    </main>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Clock,
  Info,
  RotateCcw,
  Save,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SETTINGS_LIMITS, type CompetitionSettings } from "@/lib/ccl/settings";
import {
  readApiResponse,
  settingsPath,
  type UpdateSettingsResponse,
} from "@/lib/ccl/api";

/**
 * Form pengaturan lomba (admin).
 *
 * Mengatur durasi giliran menjawab. Durasi tersimpan pada sesi dan dipakai
 * sebagai nilai awal sesi berikutnya.
 */

const COOLDOWN = SETTINGS_LIMITS.cooldownSeconds;
const NOTICE_MS = 2500;

/** Periksa isian waktu menjawab; `null` bila wajar (1–600 detik). */
function validateCooldown(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") return "Waktu menjawab wajib diisi.";
  if (!/^\d+$/.test(trimmed)) return "Masukkan angka bulat, mis. 10.";
  const value = Number(trimmed);
  if (value < COOLDOWN.min) return "Waktu menjawab minimal 1 detik.";
  if (value > COOLDOWN.max) {
    return `Waktu menjawab maksimal ${COOLDOWN.max} detik.`;
  }
  return null;
}

type Accent = {
  card: string;
  badge: string;
  addon: string;
  focus: string;
};

function SettingNumberCard({
  icon: Icon,
  label,
  hint,
  accent,
  value,
  onChange,
  error,
  min,
  max,
  addon,
  unit,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  accent: Accent;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  min: number;
  max: number;
  addon?: string;
  unit?: string;
}) {
  const inputId = useId();
  const errorId = `${inputId}-error`;

  return (
    <div
      className={`flex h-full flex-col gap-3 rounded-2xl border p-4 backdrop-blur sm:p-5 ${accent.card}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl ${accent.badge}`}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <h2 className="text-sm font-bold">{label}</h2>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          {addon ? (
            <span className={`text-lg font-bold ${accent.addon}`} aria-hidden>
              {addon}
            </span>
          ) : null}
          <input
            id={inputId}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={1}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={`h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-lg font-bold tabular-nums outline-none transition-colors focus-visible:ring-2 aria-invalid:border-destructive ${accent.focus}`}
          />
          {unit ? (
            <span className="shrink-0 text-sm font-medium text-muted-foreground">
              {unit}
            </span>
          ) : null}
        </div>
        {error ? (
          <p
            id={errorId}
            className="flex items-center gap-1.5 text-xs text-destructive"
          >
            <AlertCircle className="size-3.5" aria-hidden />
            {error}
          </p>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

type FieldKey = "cooldown";

export function SettingsForm({
  sessionId,
  sessionTitle,
  settings,
}: {
  sessionId: string;
  sessionTitle: string;
  settings: CompetitionSettings;
}) {
  const [base, setBase] = useState(settings);

  // Hanya simpan suntingan admin; nilainya jatuh kembali ke `base` bila kosong,
  // sehingga pemuatan nilai tersimpan tidak perlu setState di dalam efek.
  const [edits, setEdits] = useState<Partial<Record<FieldKey, string>>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const cooldown = edits.cooldown ?? String(base.cooldownSeconds);
  const cooldownError = validateCooldown(cooldown);
  const hasError = Boolean(cooldownError);
  const nextCooldown = hasError ? null : Number(cooldown);
  const isDirty = nextCooldown !== null && nextCooldown !== base.cooldownSeconds;

  const setField = (key: FieldKey) => (value: string) => {
    setEdits((prev) => ({ ...prev, [key]: value }));
    setNotice(null);
  };

  const handleSave = () => {
    if (nextCooldown === null || !isDirty) return;
    setSaving(true);
    setSaveError(null);
    fetch(settingsPath(sessionId), {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cooldownSeconds: nextCooldown }),
    })
      .then(async (response) => {
        const result = await readApiResponse<UpdateSettingsResponse | {
          message?: string;
        }>(response, "Gagal menyimpan pengaturan.");
        if (!response.ok || !("session" in result)) {
          throw new Error(
            ("message" in result ? result.message : undefined) ??
              "Gagal menyimpan pengaturan.",
          );
        }
        const saved: CompetitionSettings = {
          cooldownSeconds: result.session.cooldownSeconds,
          correctPoints: result.session.correctPoints,
          wrongPoints: result.session.wrongPoints,
        };
        setBase(saved);
        setEdits({});
        setNotice("Pengaturan tersimpan dan dipakai untuk sesi baru.");
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setNotice(null), NOTICE_MS);
      })
      .catch((reason: unknown) => {
        setSaveError(
          reason instanceof Error ? reason.message : "Gagal menyimpan pengaturan.",
        );
      })
      .finally(() => setSaving(false));
  };

  const handleReset = () => {
    setEdits({});
    setNotice(null);
  };

  return (
    <section className="relative flex min-h-dvh flex-col overflow-x-clip bg-background text-foreground">
      {/* Latar bercahaya. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(120%_110%_at_50%_-20%,color-mix(in_oklch,var(--color-primary)_16%,transparent),transparent_60%)]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-8 sm:px-8 sm:py-10 lg:max-w-4xl">
        <header className="space-y-3">
          <Badge variant="outline" className="text-muted-foreground">
            Pengaturan sesi
          </Badge>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Pengaturan Lomba
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Atur waktu menjawab untuk sesi{" "}
            <span className="font-semibold text-foreground">
              {sessionTitle}
            </span>
            . Timer mulai saat moderator memilih regu yang akan menjawab. Poin
            jawaban benar selalu +100; pengurangan salah dipilih moderator
            (−50, −75, atau −100).
          </p>
        </header>

        <section
          aria-label="Aturan dasar lomba"
          className="grid items-stretch gap-4 sm:gap-5 md:grid-cols-2"
        >
          <SettingNumberCard
            icon={Clock}
            label="Waktu Menjawab"
            hint="Waktu menjawab setiap regu, dimulai saat moderator memilih regu tersebut."
            accent={{
              card: "border-cyan-400/25 bg-cyan-400/[0.07]",
              badge: "bg-cyan-400/15 text-cyan-200",
              addon: "text-cyan-200",
              focus:
                "focus-visible:border-cyan-400 focus-visible:ring-cyan-400/30",
            }}
            value={cooldown}
            onChange={setField("cooldown")}
            error={cooldownError}
            min={COOLDOWN.min}
            max={COOLDOWN.max}
            unit="detik"
          />
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || hasError || saving}
            className="h-10"
          >
            <Save className="size-4" aria-hidden />
            {saving ? "Menyimpan…" : "Simpan pengaturan"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={!isDirty}
            className="h-10"
          >
            <RotateCcw className="size-4" aria-hidden />
            Kembalikan
          </Button>
          <span
            role="status"
            aria-live="polite"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-300"
          >
            {notice ? (
              <>
                <Check className="size-4" aria-hidden />
                {notice}
              </>
            ) : null}
          </span>
        </div>
        {saveError ? <p role="alert" className="text-sm text-destructive">{saveError}</p> : null}

        <p className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-fuchsia-300" aria-hidden />
          <span>
            {hasError
              ? "Perbaiki isian yang ditandai sebelum pengaturan bisa disimpan."
              : "Pengaturan tersimpan untuk sesi ini dan menjadi nilai awal saat sesi lomba berikutnya dibuat."}
          </span>
        </p>
      </div>
    </section>
  );
}

"use client";

import { useId, useState } from "react";
import {
  AlertCircle,
  Clock,
  Info,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SETTINGS_LIMITS, type CompetitionSettings } from "@/lib/ccl/settings";

/**
 * Form pengaturan lomba (admin).
 *
 * Mengatur aturan dasar lomba — waktu menjawab dan nilai poin benar/salah.
 * Tahap ini menyimpan nilai di state klien; simpan/muat ke server menyusul pada
 * tugas berikutnya.
 */

const COOLDOWN = SETTINGS_LIMITS.cooldownSeconds;
const POINTS_MAX = SETTINGS_LIMITS.points.max;

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

/** Periksa isian poin (besar nilai, tanpa tanda); `null` bila wajar. */
function validatePoints(raw: string, what: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") return `Poin ${what} wajib diisi.`;
  if (!/^\d+$/.test(trimmed)) return "Masukkan angka bulat, mis. 100.";
  const value = Number(trimmed);
  if (value > POINTS_MAX) return `Poin maksimal ${POINTS_MAX}.`;
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

export function SettingsForm({
  sessionTitle,
  settings,
}: {
  sessionTitle: string;
  settings: CompetitionSettings;
}) {
  const [cooldown, setCooldown] = useState(String(settings.cooldownSeconds));
  const [correct, setCorrect] = useState(
    String(Math.abs(settings.correctPoints)),
  );
  const [wrong, setWrong] = useState(String(Math.abs(settings.wrongPoints)));

  const cooldownError = validateCooldown(cooldown);
  const correctError = validatePoints(correct, "jawaban benar");
  const wrongError = validatePoints(wrong, "jawaban salah");
  const hasError = Boolean(cooldownError || correctError || wrongError);

  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-clip bg-background text-foreground">
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
            Fase 3 · data tiruan
          </Badge>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Pengaturan Lomba
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Atur waktu menjawab dan nilai poin untuk sesi{" "}
            <span className="font-semibold text-foreground">
              {sessionTitle}
            </span>
            . Nilai ini langsung dipakai saat lomba berjalan.
          </p>
        </header>

        <section
          aria-label="Aturan dasar lomba"
          className="grid items-stretch gap-4 sm:gap-5 md:grid-cols-3"
        >
          <SettingNumberCard
            icon={Clock}
            label="Waktu Menjawab"
            hint="Hitungan mundur regu untuk menekan tombol jawab setelah soal dibuka."
            accent={{
              card: "border-cyan-400/25 bg-cyan-400/[0.07]",
              badge: "bg-cyan-400/15 text-cyan-200",
              addon: "text-cyan-200",
              focus:
                "focus-visible:border-cyan-400 focus-visible:ring-cyan-400/30",
            }}
            value={cooldown}
            onChange={setCooldown}
            error={cooldownError}
            min={COOLDOWN.min}
            max={COOLDOWN.max}
            unit="detik"
          />
          <SettingNumberCard
            icon={TrendingUp}
            label="Poin Jawaban Benar"
            hint="Ditambahkan ke skor regu saat jawabannya benar."
            accent={{
              card: "border-emerald-400/25 bg-emerald-400/[0.07]",
              badge: "bg-emerald-400/15 text-emerald-200",
              addon: "text-emerald-200",
              focus:
                "focus-visible:border-emerald-400 focus-visible:ring-emerald-400/30",
            }}
            value={correct}
            onChange={setCorrect}
            error={correctError}
            min={0}
            max={POINTS_MAX}
            addon="+"
          />
          <SettingNumberCard
            icon={TrendingDown}
            label="Poin Jawaban Salah"
            hint="Dikurangi dari skor regu saat jawabannya salah."
            accent={{
              card: "border-rose-400/25 bg-rose-400/[0.07]",
              badge: "bg-rose-400/15 text-rose-200",
              addon: "text-rose-200",
              focus:
                "focus-visible:border-rose-400 focus-visible:ring-rose-400/30",
            }}
            value={wrong}
            onChange={setWrong}
            error={wrongError}
            min={0}
            max={POINTS_MAX}
            addon="−"
          />
        </section>

        <p className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-fuchsia-300" aria-hidden />
          <span>
            {hasError
              ? "Perbaiki isian yang ditandai sebelum pengaturan bisa dipakai."
              : "Nilai awal ini sudah masuk akal, jadi lomba bisa langsung dimulai tanpa mengubah apa pun. Isian yang tidak wajar (mis. waktu 0 detik atau poin bukan angka) akan ditolak."}
          </span>
        </p>
      </div>
    </main>
  );
}

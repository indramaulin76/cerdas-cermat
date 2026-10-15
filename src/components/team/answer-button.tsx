"use client";

/**
 * Komponen tombol jawab raksasa yang responsif.
 *
 * Ini adalah elemen paling penting bagi regu: satu tombol besar yang nyaman
 * ditekan di HP, tablet, maupun layar besar. Ukuran dan tipografinya memakai
 * `clamp()` agar tetap proporsional di semua ukuran layar, dan penekanan
 * dideteksi lewat `onPointerDown` (bukan hanya `onClick`) supaya sinyal
 * "klik pertama" tercatat sedini mungkin.
 *
 * Komponen ini murni presentasional: ia hanya menggambar tombol sesuai
 * `visual` yang diberikan, tanpa tahu soal state lomba. Logika state ada di
 * `useTeamBuzzer`.
 */

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { Check, Clock, Hand, Lock, TriangleAlert } from "lucide-react";
import { cn } from "cn";

/** Tampilan tombol untuk tiap fase. */
export type AnswerButtonVisual =
  /** Belum ada soal: tombol redup, belum bisa ditekan. */
  | "waiting"
  /** Soal dibuka: tombol menyala & berdenyut, siap ditekan. */
  | "armed"
  /** Regu ini menekan paling dulu. */
  | "won"
  /** Regu lain menekan lebih dulu — tombol terkunci. */
  | "locked"
  /** Waktu habis sebelum ada yang menekan. */
  | "timeout";

const ICON: Record<AnswerButtonVisual, ReactNode> = {
  waiting: <Clock className="size-6" aria-hidden />,
  armed: <Hand className="size-7" aria-hidden />,
  won: <Check className="size-7" aria-hidden />,
  locked: <Lock className="size-6" aria-hidden />,
  timeout: <TriangleAlert className="size-6" aria-hidden />,
};

export type AnswerButtonProps = {
  /** Fase tampilan tombol. */
  visual: AnswerButtonVisual;
  /** Warna identitas regu (hex) untuk aksen tombol. */
  color: string;
  /** Teks utama besar di tengah tombol. */
  label: string;
  /** Teks kecil pendukung di bawah label. */
  sublabel?: string;
  /** Label aksesibilitas untuk pembaca layar. */
  ariaLabel: string;
  /** Dipanggil saat regu menekan tombol (hanya saat `armed`). */
  onPress?: () => void;
  className?: string;
};

export function AnswerButton({
  visual,
  color,
  label,
  sublabel,
  ariaLabel,
  onPress,
  className,
}: AnswerButtonProps) {
  const armed = visual === "armed";
  const colored = armed || visual === "won";

  // Penanda tiap penekanan, dipakai untuk memicu ulang animasi burst.
  const [burst, setBurst] = useState(0);

  const style: CSSProperties = colored
    ? {
        background: armed
          ? `linear-gradient(155deg, color-mix(in oklab, ${color} 72%, white) 0%, ${color} 55%, color-mix(in oklab, ${color} 78%, black) 100%)`
          : `linear-gradient(155deg, color-mix(in oklab, ${color} 80%, white) 0%, ${color} 100%)`,
        boxShadow: `0 26px 80px -20px ${color}`,
        color: "#fff",
      }
    : {};

  const handlePress = () => {
    if (!armed) return;
    // Umpan balik visual instan (shockwave) + getaran singkat bila didukung.
    setBurst((value) => value + 1);
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(40);
    }
    onPress?.();
  };

  return (
    <div className="relative flex items-center justify-center">
      {armed && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -m-3 animate-ping rounded-full opacity-30 motion-reduce:animate-none"
            style={{ backgroundColor: color }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -m-6 rounded-full opacity-40 blur-2xl"
            style={{ backgroundColor: color }}
          />
        </>
      )}

      <button
        type="button"
        onPointerDown={handlePress}
        onClick={handlePress}
        disabled={!armed}
        aria-label={ariaLabel}
        className={cn(
          "relative z-10 flex size-[clamp(15rem,76vw,21rem)] select-none items-center justify-center rounded-full border text-center transition-transform duration-150",
          "touch-manipulation [-webkit-tap-highlight-color:transparent]",
          "focus-visible:ring-4 focus-visible:ring-ring/60 focus-visible:outline-none",
          colored
            ? armed
              ? "cursor-pointer border-white/20 active:scale-[0.97]"
              : "border-white/20 animate-ccl-pop motion-reduce:animate-none"
            : visual === "locked"
              ? "border-dashed border-border bg-card text-muted-foreground animate-ccl-shake motion-reduce:animate-none"
              : "border-dashed border-border bg-card text-muted-foreground",
          className,
        )}
        style={style}
      >
        {/* Shockwave saat tombol ditekan; `key` memicu ulang animasi tiap tekan. */}
        {burst > 0 && (
          <span
            key={burst}
            aria-hidden
            className="pointer-events-none absolute inset-0 animate-ccl-burst rounded-full motion-reduce:animate-none"
            style={{ backgroundColor: color }}
          />
        )}

        <span className="relative z-10 flex flex-col items-center gap-3">
          <span
            className={cn(
              "flex size-14 items-center justify-center rounded-full backdrop-blur-sm",
              colored ? "bg-black/15" : "bg-foreground/5",
            )}
          >
            {ICON[visual]}
          </span>
          <span className="px-6 text-[clamp(1.5rem,7vw,2.25rem)] font-black tracking-tight text-balance">
            {label}
          </span>
          {sublabel ? (
            <span
              className={cn(
                "max-w-[13rem] px-4 text-xs font-medium leading-snug text-balance",
                colored ? "text-white/85" : "text-muted-foreground",
              )}
            >
              {sublabel}
            </span>
          ) : null}
        </span>
      </button>
    </div>
  );
}

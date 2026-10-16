"use client";

import { useCallback, useEffect, useState } from "react";

import { cn } from "cn";

/**
 * Gerbang PIN untuk membuka Layar Penonton.
 *
 * Layar penonton hanya boleh dibuka oleh orang yang tahu PIN dari admin.
 * Tahap ini membandingkan PIN di sisi klien (data tiruan); validasi server
 * menyusul, sehingga PIN asli tidak pernah bocor ke perangkat penonton.
 */

const PIN_LENGTH = 4;

export function ViewerPinGate({
  title,
  expectedPin,
  onUnlock,
}: {
  title: string;
  expectedPin: string;
  onUnlock: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  // Validasi otomatis begitu 4 digit terisi. Dijalankan lewat efek (bukan di
  // dalam updater state) supaya aman dari pemanggilan ganda di StrictMode.
  useEffect(() => {
    if (pin.length < PIN_LENGTH) return;

    const timer = window.setTimeout(() => {
      if (pin === expectedPin) {
        onUnlock();
        return;
      }
      setError(true);
      window.setTimeout(() => {
        setPin("");
        setError(false);
      }, 550);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [pin, expectedPin, onUnlock]);

  const press = useCallback((digit: string) => {
    setPin((current) =>
      current.length >= PIN_LENGTH ? current : current + digit,
    );
  }, []);

  const backspace = useCallback(() => {
    setPin((current) => current.slice(0, -1));
  }, []);

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-5 py-10 text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_-20%,color-mix(in_oklch,var(--color-primary)_24%,transparent),transparent_60%)]"
      />

      <div
        className={cn(
          "relative z-10 w-full max-w-sm rounded-4xl border border-border/60 bg-card/70 p-6 backdrop-blur sm:p-8",
          error && "animate-ccl-shake",
        )}
      >
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Layar Penonton
          </p>
          <h1 className="mt-1 text-lg font-bold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Masukkan PIN dari admin untuk membuka layar.
          </p>
        </div>

        {/* Titik PIN */}
        <div
          className="mt-6 flex justify-center gap-3"
          role="status"
          aria-label={`${pin.length} dari ${PIN_LENGTH} digit terisi`}
        >
          {Array.from({ length: PIN_LENGTH }).map((_, index) => (
            <span
              key={index}
              className={cn(
                "size-4 rounded-full border-2 transition-colors",
                index < pin.length
                  ? "border-primary bg-primary"
                  : "border-border bg-transparent",
                error && "border-destructive bg-destructive",
              )}
            />
          ))}
        </div>

        <p
          className={cn(
            "mt-3 h-5 text-center text-sm",
            error ? "text-destructive" : "text-transparent",
          )}
          aria-live="polite"
        >
          PIN salah, coba lagi.
        </p>

        {/* Papan angka */}
        <div className="mt-2 grid grid-cols-3 gap-2 sm:gap-3">
          {keys.map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => press(digit)}
              className="flex h-14 items-center justify-center rounded-2xl border border-border/60 bg-background/60 text-2xl font-bold tabular-nums transition-transform hover:bg-muted active:scale-95 sm:h-16"
            >
              {digit}
            </button>
          ))}
          <span aria-hidden />
          <button
            type="button"
            onClick={() => press("0")}
            className="flex h-14 items-center justify-center rounded-2xl border border-border/60 bg-background/60 text-2xl font-bold tabular-nums transition-transform hover:bg-muted active:scale-95 sm:h-16"
          >
            0
          </button>
          <button
            type="button"
            onClick={backspace}
            aria-label="Hapus"
            className="flex h-14 items-center justify-center rounded-2xl border border-border/60 bg-background/60 text-xl transition-transform hover:bg-muted active:scale-95 sm:h-16"
          >
            ⌫
          </button>
        </div>
      </div>
    </main>
  );
}

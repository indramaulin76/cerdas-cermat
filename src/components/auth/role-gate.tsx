"use client";

import {
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { RolePinGate } from "@/components/auth/role-pin-gate";
import { getRolePin, type RoleId } from "@/lib/ccl/roles";
import { MOCK_SESSIONS } from "@/lib/mock/sessions";
import {
  getCreatedSession,
  subscribeCreatedSessions,
} from "@/lib/mock/session-store";

/**
 * Pembungkus halaman peran: menahan tampilan di balik gerbang PIN per peran,
 * lalu menampilkan isi halaman setelah PIN benar.
 *
 * Sesi dibaca dari query `?session=<id>` (dari link yang dibagikan admin); bila
 * tidak ada, dipakai sesi tiruan yang sedang aktif. Status terbuka disimpan di
 * `sessionStorage` per sesi+peran supaya refresh tidak menanyakan PIN berulang
 * kali. Dibaca lewat `useSyncExternalStore` agar aman untuk SSR (server
 * menganggap terkunci).
 */

const noopSubscribe = () => () => {};

/** Baca id sesi dari query URL (`?session=...`); kosong saat SSR. */
function readSessionIdFromUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    return new URLSearchParams(window.location.search).get("session") ?? "";
  } catch {
    return "";
  }
}

// Cadangan status terbuka di memori bila sessionStorage tidak tersedia.
const unlockedKeys = new Set<string>();
const listeners = new Set<() => void>();

function emitUnlock() {
  for (const listener of listeners) listener();
}

function subscribeUnlock(listener: () => void) {
  listeners.add(listener);
  const onStorage = () => listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function readUnlocked(key: string): boolean {
  if (unlockedKeys.has(key)) return true;
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function RoleGate({
  role,
  defaultSessionId,
  children,
}: {
  role: RoleId;
  /** Sesi yang dipakai bila link tidak membawa `?session=`. */
  defaultSessionId: string;
  children: ReactNode;
}) {
  const urlSessionId = useSyncExternalStore(
    noopSubscribe,
    readSessionIdFromUrl,
    () => "",
  );
  const sessionId = urlSessionId || defaultSessionId;

  const stored = useSyncExternalStore(
    subscribeCreatedSessions,
    () => getCreatedSession(sessionId),
    () => null,
  );
  const session =
    MOCK_SESSIONS.find((item) => item.id === sessionId) ?? stored;

  const storageKey = `ccl:role:unlocked:${sessionId}:${role}`;
  const getUnlocked = useCallback(() => readUnlocked(storageKey), [storageKey]);
  const unlocked = useSyncExternalStore(subscribeUnlock, getUnlocked, () => false);

  const handleUnlock = useCallback(() => {
    unlockedKeys.add(storageKey);
    try {
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // Penyimpanan tidak tersedia; cadangan di memori tetap dipakai.
    }
    emitUnlock();
  }, [storageKey]);

  if (!session) {
    return (
      <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-x-clip bg-background px-5 py-8 text-center text-foreground">
        <div className="max-w-sm rounded-4xl border border-white/10 bg-white/[0.05] p-8 backdrop-blur-xl">
          <h1 className="text-lg font-bold">Sesi tidak ditemukan</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Link yang kamu buka tidak cocok dengan sesi mana pun. Minta link
            baru ke admin.
          </p>
        </div>
      </main>
    );
  }

  if (!unlocked) {
    return (
      <RolePinGate
        role={role}
        title={session.title}
        expectedPin={getRolePin(sessionId, role)}
        onUnlock={handleUnlock}
      />
    );
  }

  return <>{children}</>;
}

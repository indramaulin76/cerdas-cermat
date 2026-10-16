"use client";

import { useCallback, useSyncExternalStore } from "react";

import { ViewerPinGate } from "@/components/viewer/viewer-pin-gate";
import { ViewerScreen } from "@/components/viewer/viewer-screen";
import type { Session } from "@/lib/ccl/types";

/**
 * Pembungkus Layar Penonton: menahan tampilan di balik gerbang PIN lalu
 * menampilkan papan skor setelah terbuka.
 *
 * Status terbuka disimpan di `sessionStorage` per sesi supaya refresh di
 * proyektor tidak menanyakan PIN berulang kali. Dibaca lewat
 * `useSyncExternalStore` agar aman untuk SSR (server menganggap terkunci),
 * dengan cadangan di memori bila penyimpanan tidak tersedia.
 */

const unlockedKeys = new Set<string>();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function readUnlocked(key: string): boolean {
  if (unlockedKeys.has(key)) return true;
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  const onStorage = () => onStoreChange();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function ViewerApp({
  session,
  expectedPin,
}: {
  session: Session;
  expectedPin: string;
}) {
  const storageKey = `ccl:viewer:unlocked:${session.id}`;
  const getSnapshot = useCallback(() => readUnlocked(storageKey), [storageKey]);
  const unlocked = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const handleUnlock = useCallback(() => {
    unlockedKeys.add(storageKey);
    try {
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // Penyimpanan tidak tersedia; cadangan di memori tetap dipakai.
    }
    emit();
  }, [storageKey]);

  if (!unlocked) {
    return (
      <ViewerPinGate
        title={session.title}
        expectedPin={expectedPin}
        onUnlock={handleUnlock}
      />
    );
  }

  return <ViewerScreen session={session} />;
}

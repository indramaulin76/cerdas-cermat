"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { ROLE_INFO, type RoleId } from "@/lib/ccl/roles";
import { readApiResponse, roleAuthPath } from "@/lib/ccl/api";

type RoleSession = { sessionId: string };
const RoleSessionContext = createContext<RoleSession | null>(null);
const noOpSubscribe = () => () => {};
const readSessionId = () =>
  new URLSearchParams(window.location.search).get("session") ?? "";

export function useRoleSession(): RoleSession {
  const value = useContext(RoleSessionContext);
  if (!value) throw new Error("useRoleSession harus dipakai di dalam RoleGate.");
  return value;
}

export function RoleGate({
  role,
  children,
}: {
  role: RoleId;
  children: ReactNode;
}) {
  const sessionId = useSyncExternalStore(
    noOpSubscribe,
    readSessionId,
    () => "",
  );
  const [checkedSessionId, setCheckedSessionId] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    let active = true;
    fetch(roleAuthPath(sessionId, role), { credentials: "same-origin" })
      .then(async (response) => {
        const result = await readApiResponse<{
          authenticated?: boolean;
          message?: string;
        }>(response, "Gagal memeriksa akses.");
        if (!response.ok) throw new Error(result.message ?? "Gagal memeriksa akses.");
        if (active) {
          setAuthenticated(result.authenticated === true);
          setError(null);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error ? reason.message : "Gagal memeriksa akses.",
          );
        }
      })
      .finally(() => {
        if (active) setCheckedSessionId(sessionId);
      });

    return () => {
      active = false;
    };
  }, [role, sessionId]);

  const unlock = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sessionId || pin.trim() === "") return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(roleAuthPath(sessionId, role), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const result = await readApiResponse<{
        authenticated?: boolean;
        message?: string;
      }>(response, "Gagal masuk.");
      if (!response.ok || result.authenticated !== true) {
        throw new Error(result.message ?? "PIN tidak cocok.");
      }
      setAuthenticated(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal masuk.");
      setPin("");
    } finally {
      setSubmitting(false);
    }
  }, [pin, role, sessionId]);

  if (authenticated) {
    return (
      <RoleSessionContext.Provider value={{ sessionId }}>
        {children}
      </RoleSessionContext.Provider>
    );
  }

  const info = ROLE_INFO[role];
  const checking = sessionId !== "" && checkedSessionId !== sessionId;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-8 text-foreground">
      <form
        onSubmit={unlock}
        className="w-full max-w-sm space-y-5 rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur-xl"
      >
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-300">
            {info.label}
          </p>
          <h1 className="mt-2 text-xl font-black">{info.gateTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {sessionId ? info.gateHint : "Link sesi wajib disertakan."}
          </p>
        </header>
        {checking ? (
          <p className="text-center text-sm text-muted-foreground">
            Memeriksa akses…
          </p>
        ) : !sessionId ? (
          <p role="alert" className="text-center text-sm text-destructive">
            Link tidak menyertakan sesi lomba. Minta link terbaru kepada admin.
          </p>
        ) : (
          <>
            <label className="block space-y-2 text-sm font-medium">
              <span>PIN sesi</span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={12}
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-center text-xl tracking-[0.4em] outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60"
                disabled={!sessionId || submitting}
              />
            </label>
            {error ? (
              <p role="alert" className="text-center text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={!sessionId || pin.trim() === "" || submitting}
              className="h-12 w-full rounded-xl bg-foreground font-bold text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Memeriksa…" : "Masuk"}
            </button>
          </>
        )}
      </form>
    </main>
  );
}

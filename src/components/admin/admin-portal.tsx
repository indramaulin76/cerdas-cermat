"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { adminAuthPath } from "@/lib/ccl/api";

type Admin = { id: string; name: string; email: string; role: "admin" | "panitia" };

export function AdminPortal() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("admin@ccl.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(adminAuthPath(), { credentials: "same-origin" })
      .then(async (response) => {
        const result = (await response.json()) as {
          authenticated?: boolean;
          admin?: Admin | null;
          message?: string;
        };
        if (!response.ok) throw new Error(result.message ?? "Gagal memeriksa login.");
        if (active && result.authenticated) setAdmin(result.admin ?? null);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Gagal memeriksa login.");
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(adminAuthPath(), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json()) as {
        admin?: Admin;
        message?: string;
      };
      if (!response.ok || !result.admin) {
        throw new Error(result.message ?? "Email atau kata sandi salah.");
      }
      setAdmin(result.admin);
      setPassword("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal masuk.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(adminAuthPath(), {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("Gagal keluar. Coba lagi.");
      setAdmin(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal keluar.");
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return <main className="grid min-h-dvh place-items-center text-muted-foreground">Memeriksa akses…</main>;
  }

  if (!admin) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-8 text-foreground">
        <form onSubmit={login} className="w-full max-w-sm space-y-5 rounded-3xl border border-white/10 bg-white/[0.05] p-6">
          <header className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-300">Cerdas Cermat Live</p>
            <h1 className="mt-2 text-2xl font-black">Masuk Panitia</h1>
            <p className="mt-2 text-sm text-muted-foreground">Masuk untuk mengelola sesi dan pengaturan lomba.</p>
          </header>
          <label className="block space-y-1.5 text-sm font-medium">
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60"
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            <span>Kata sandi</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60"
            />
          </label>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <button
            type="submit"
            disabled={busy || !email || !password}
            className="h-11 w-full rounded-xl bg-foreground font-bold text-background disabled:opacity-50"
          >
            {busy ? "Memeriksa…" : "Masuk"}
          </button>
          <p className="text-center text-xs text-muted-foreground">
            Akun awal dikonfigurasi melalui <code>CCL_ADMIN_EMAIL</code> dan <code>CCL_ADMIN_PASSWORD</code>.
          </p>
        </form>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-dvh flex-col bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-5 py-8 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-fuchsia-300">Cerdas Cermat Live</p>
            <h1 className="text-3xl font-black">Halo, {admin.name}</h1>
            <p className="text-sm text-muted-foreground">{admin.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            disabled={busy}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/5 disabled:opacity-50"
          >
            Keluar
          </button>
        </header>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <section className="grid gap-4 sm:grid-cols-2">
          <Link href="/sesi" className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:bg-white/[0.08]">
            <h2 className="text-xl font-bold">Sesi &amp; link</h2>
            <p className="mt-2 text-sm text-muted-foreground">Buat lomba, atur regu, lalu bagikan tautan dan PIN.</p>
          </Link>
          {admin.role === "admin" ? (
            <Link href="/panitia" className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:bg-white/[0.08]">
              <h2 className="text-xl font-bold">Akun panitia</h2>
              <p className="mt-2 text-sm text-muted-foreground">Tambah, ubah, atau cabut akses akun panitia.</p>
            </Link>
          ) : null}
        </section>
      </div>
    </main>
  );
}

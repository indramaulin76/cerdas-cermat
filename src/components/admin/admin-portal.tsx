"use client";

import Link from "next/link";

const admin = { name: "Admin", role: "admin" as const };

export function AdminPortal() {
  return (
    <main className="relative flex min-h-dvh flex-col bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-5 py-8 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-fuchsia-300">Cerdas Cermat Live</p>
            <h1 className="text-3xl font-black">Halo, {admin.name}</h1>
          </div>
        </header>
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { AdminUserDto } from "@/lib/ccl/api";
import { adminUsersPath, readApiResponse } from "@/lib/ccl/api";

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    const response = await fetch(adminUsersPath(), { credentials: "same-origin" });
    const result = await readApiResponse<{
      users?: AdminUserDto[];
      message?: string;
    }>(response, "Gagal memuat akun panitia.");
    if (!response.ok) throw new Error(result.message ?? "Gagal memuat akun panitia.");
    setUsers(result.users ?? []);
  }

  useEffect(() => {
    let active = true;
    fetch(adminUsersPath(), { credentials: "same-origin" })
      .then(async (response) => {
        const result = await readApiResponse<{
          users?: AdminUserDto[];
          message?: string;
        }>(response, "Gagal memuat akun.");
        if (!response.ok) throw new Error(result.message ?? "Gagal memuat akun.");
        if (active) setUsers(result.users ?? []);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Gagal memuat akun.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function resetForm() {
    setEditing(null);
    setName("");
    setEmail("");
    setPassword("");
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(adminUsersPath(), {
        method: editing ? "PATCH" : "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(editing ? { id: editing } : {}),
          name,
          email,
          ...(password ? { password } : {}),
        }),
      });
      const result = await readApiResponse<{ message?: string }>(
        response,
        "Gagal menyimpan akun.",
      );
      if (!response.ok) throw new Error(result.message ?? "Gagal menyimpan akun.");
      await load();
      resetForm();
      setNotice(editing ? "Akun panitia diperbarui." : "Akun panitia ditambahkan.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menyimpan akun.");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Hapus akses akun panitia ini?")) return;
    setError(null);
    try {
      const response = await fetch(`${adminUsersPath()}?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const result = await readApiResponse<{ message?: string }>(
        response,
        "Gagal menghapus akun.",
      );
      if (!response.ok) throw new Error(result.message ?? "Gagal menghapus akun.");
      await load();
      setNotice("Akses akun dicabut.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menghapus akun.");
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-5 py-8 text-foreground sm:px-8">
      <header>
        <h1 className="text-2xl font-black sm:text-3xl">Kelola akun panitia</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Akun awal dari konfigurasi server tidak dapat dihapus. Kata sandi akun disimpan sebagai hash.
        </p>
      </header>

      {!loading && !error ? <form onSubmit={save} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="font-bold">{editing ? "Ubah akun panitia" : "Tambah panitia"}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Nama</span>
            <input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3" />
          </label>
          <label className="space-y-1 text-sm">
            <span>Email</span>
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3" />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span>Kata sandi {editing ? "(kosongkan jika tidak diubah)" : "(minimal 8 karakter)"}</span>
            <input required={!editing} type="password" minLength={editing ? undefined : 8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3" />
          </label>
        </div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        {notice ? <p role="status" className="text-sm text-emerald-300">{notice}</p> : null}
        <div className="flex gap-2">
          <button type="submit" className="rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background">
            {editing ? "Simpan perubahan" : "Tambah akun"}
          </button>
          {editing ? <button type="button" onClick={resetForm} className="rounded-xl border border-white/10 px-4 py-2 text-sm">Batal</button> : null}
        </div>
      </form> : null}

      <section aria-label="Daftar akun panitia" className="space-y-3">
        <h2 className="font-bold">Akun terdaftar</h2>
        {loading ? <p className="text-sm text-muted-foreground">Memuat…</p> : null}
        {!loading && !error ? users.map((user) => (
          <article key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div>
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email} · {user.role}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => {
                setEditing(user.id);
                setName(user.name);
                setEmail(user.email);
                setPassword("");
                setError(null);
                setNotice(null);
              }} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm">Ubah</button>
              <button type="button" onClick={() => remove(user.id)} className="rounded-lg border border-rose-400/30 px-3 py-1.5 text-sm text-rose-300">Hapus</button>
            </div>
          </article>
        )) : null}
        {!loading && !error && users.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada akun tambahan.</p> : null}
      </section>
      {error ? <Link href="/" className="text-sm underline">Kembali ke dashboard panitia</Link> : null}
    </main>
  );
}

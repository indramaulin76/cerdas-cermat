import type { Metadata } from "next";

import { AdminUsers } from "@/components/admin/admin-users";

export const metadata: Metadata = {
  title: "Akun Panitia — Cerdas Cermat Live",
  description: "Kelola akun panitia yang memiliki akses ke sesi lomba.",
};

export default function AdminUsersPage() {
  return <AdminUsers />;
}

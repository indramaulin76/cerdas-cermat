import { NextResponse } from "next/server";

import type { AdminAuthResponse } from "@/lib/ccl/api";
import { getCurrentAdmin } from "@/server/admin-auth";

/** Mengembalikan identitas admin bootstrap; login dinonaktifkan. */
export async function GET() {
  const admin = await getCurrentAdmin();
  const response: AdminAuthResponse = {
    ok: true,
    authenticated: true,
    admin,
  };
  return NextResponse.json(response);
}

/**
 * Neon PostgreSQL client.
 *
 * DATABASE_URL must be a Neon PostgreSQL connection string. The shared pool
 * works across warm serverless invocations without storing application state.
 */

import "server-only";

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (
  !connectionString ||
  !/^postgres(?:ql)?:\/\//i.test(connectionString)
) {
  throw new Error(
    "DATABASE_URL harus berupa connection string PostgreSQL Neon.",
  );
}

const globalForPool = globalThis as unknown as { __cclNeonPool?: Pool };
const pool =
  globalForPool.__cclNeonPool ??
  new Pool({ connectionString, max: 5 });
globalForPool.__cclNeonPool = pool;

export const db = drizzle(pool, { schema });

export { schema };
export type Database = typeof db;

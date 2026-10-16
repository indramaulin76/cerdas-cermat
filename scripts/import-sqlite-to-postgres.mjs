import Database from "better-sqlite3";
import { Pool } from "@neondatabase/serverless";
import { existsSync } from "node:fs";

const databaseUrl = process.env.DATABASE_URL;
const sqlitePath = process.env.SQLITE_SOURCE_PATH ?? "./data/ccl.db";

if (!databaseUrl || !/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
  throw new Error("Set DATABASE_URL to the target PostgreSQL connection string.");
}
if (!existsSync(sqlitePath)) {
  throw new Error(`SQLite source database was not found at ${sqlitePath}.`);
}

function toDate(value, nullable = false) {
  if (value === null || value === undefined) {
    if (nullable) return null;
    throw new Error("A required SQLite timestamp is empty.");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid SQLite timestamp: ${String(value)}`);
  }
  return date;
}

const source = new Database(sqlitePath, { readonly: true });
const pool = new Pool({ connectionString: databaseUrl, max: 1 });
const client = await pool.connect();

try {
  const users = source
    .prepare(
      "SELECT id, name, email, password_hash, role, created_at FROM users ORDER BY id",
    )
    .all();
  const sessions = source
    .prepare(
      `SELECT id, title, moderator_pin, viewer_pin, team_pin,
        cooldown_seconds, correct_points, wrong_points, status, created_at, updated_at
      FROM sessions ORDER BY id`,
    )
    .all();
  const teams = source
    .prepare(
      "SELECT id, session_id, name, color, score, created_at FROM teams ORDER BY id",
    )
    .all();
  const rounds = source
    .prepare(
      `SELECT id, session_id, order_number, status, started_at, answering_team_id,
        answer_started_at, awaiting_next, ended_at, created_at
      FROM rounds ORDER BY id`,
    )
    .all();
  const buzzEvents = source
    .prepare(
      `SELECT id, session_id, team_id, round_id, reaction_ms, is_first,
        answer_status, created_at
      FROM buzz_events ORDER BY id`,
    )
    .all();

  await client.query("BEGIN");

  for (const row of users) {
    await client.query(
      `INSERT INTO users (id, name, email, password_hash, role, created_at)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
      [row.id, row.name, row.email, row.password_hash, row.role, toDate(row.created_at)],
    );
  }
  for (const row of sessions) {
    await client.query(
      `INSERT INTO sessions (
        id, title, moderator_pin, viewer_pin, team_pin, cooldown_seconds,
        correct_points, wrong_points, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO NOTHING`,
      [
        row.id,
        row.title,
        row.moderator_pin,
        row.viewer_pin,
        row.team_pin,
        row.cooldown_seconds,
        row.correct_points,
        row.wrong_points,
        row.status,
        toDate(row.created_at),
        toDate(row.updated_at),
      ],
    );
  }
  for (const row of teams) {
    await client.query(
      `INSERT INTO teams (id, session_id, name, color, score, created_at)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
      [row.id, row.session_id, row.name, row.color, row.score, toDate(row.created_at)],
    );
  }
  for (const row of rounds) {
    await client.query(
      `INSERT INTO rounds (
        id, session_id, order_number, status, started_at, answering_team_id,
        answer_started_at, awaiting_next, ended_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING`,
      [
        row.id,
        row.session_id,
        row.order_number,
        row.status,
        toDate(row.started_at, true),
        row.answering_team_id,
        toDate(row.answer_started_at, true),
        Boolean(row.awaiting_next),
        toDate(row.ended_at, true),
        toDate(row.created_at),
      ],
    );
  }
  for (const row of buzzEvents) {
    await client.query(
      `INSERT INTO buzz_events (
        id, session_id, team_id, round_id, reaction_ms, is_first,
        answer_status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING`,
      [
        row.id,
        row.session_id,
        row.team_id,
        row.round_id,
        row.reaction_ms,
        Boolean(row.is_first),
        row.answer_status,
        toDate(row.created_at),
      ],
    );
  }

  await client.query("COMMIT");
  console.info(
    `Imported ${users.length} users, ${sessions.length} sessions, ${teams.length} teams, ${rounds.length} rounds, and ${buzzEvents.length} buzz events. SQLite source was preserved.`,
  );
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  source.close();
  await pool.end();
}

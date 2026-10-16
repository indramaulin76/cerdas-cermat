/**
 * Skema PostgreSQL Cerdas Cermat Live.
 *
 * PostgreSQL terkelola menjaga data tetap persisten di deployment serverless.
 */

import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull().default("Cerdas Cermat Live"),
    moderatorPin: text("moderator_pin"),
    viewerPin: text("viewer_pin"),
    teamPin: text("team_pin"),
    cooldownSeconds: integer("cooldown_seconds").notNull().default(10),
    correctPoints: integer("correct_points").notNull().default(100),
    wrongPoints: integer("wrong_points").notNull().default(-50),
    status: text("status", { enum: ["draft", "active", "finished"] })
      .notNull()
      .default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("sessions_created_at_idx").on(table.createdAt),
    index("sessions_status_idx").on(table.status),
  ],
);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["admin", "panitia"] })
      .notNull()
      .default("panitia"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_unq").on(table.email),
    index("users_created_at_idx").on(table.createdAt),
  ],
);

export const teams = pgTable(
  "teams",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull(),
    score: integer("score").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("teams_session_id_idx").on(table.sessionId),
    uniqueIndex("teams_session_name_unq").on(table.sessionId, table.name),
  ],
);

export const rounds = pgTable(
  "rounds",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    orderNumber: integer("order_number").notNull().default(0),
    status: text("status", { enum: ["draft", "open", "closed"] })
      .notNull()
      .default("draft"),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    answeringTeamId: text("answering_team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    answerStartedAt: timestamp("answer_started_at", {
      withTimezone: true,
      mode: "date",
    }),
    awaitingNext: boolean("awaiting_next").notNull().default(false),
    endedAt: timestamp("ended_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("rounds_session_id_idx").on(table.sessionId)],
);

export const buzzEvents = pgTable(
  "buzz_events",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    roundId: text("round_id").references(() => rounds.id, {
      onDelete: "set null",
    }),
    reactionMs: integer("reaction_ms").notNull(),
    isFirst: boolean("is_first").notNull().default(false),
    answerStatus: text("answer_status", {
      enum: ["wrong", "timeout", "correct"],
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("buzz_events_session_id_idx").on(table.sessionId),
    index("buzz_events_round_id_idx").on(table.roundId),
    index("buzz_events_team_id_idx").on(table.teamId),
    uniqueIndex("buzz_events_round_team_unq").on(table.roundId, table.teamId),
  ],
);

export type TeamRow = typeof teams.$inferSelect;
export type NewTeamRow = typeof teams.$inferInsert;
export type RoundRow = typeof rounds.$inferSelect;
export type NewRoundRow = typeof rounds.$inferInsert;
export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type BuzzEventRow = typeof buzzEvents.$inferSelect;
export type NewBuzzEventRow = typeof buzzEvents.$inferInsert;

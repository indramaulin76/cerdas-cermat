import { NextResponse, type NextRequest } from "next/server";

import type { ApiErrorResponse } from "@/lib/ccl/api";
import { requireModerator } from "@/server/auth";
import { publish } from "@/server/events";
import {
  advanceToNextTeam,
  getRoundStateEvent,
  recordAnswerResult,
  selectAnsweringTeam,
  toRoundDto,
} from "@/server/round";
import { toTeamDto } from "@/server/team";

type RouteParams = { params: Promise<{ sessionId: string }> };
type Action = "select" | "next" | "correct" | "wrong";

function errorResponse(error: string, message: string, status: number) {
  return NextResponse.json<ApiErrorResponse>({ ok: false, error, message }, { status });
}

function publishCurrentRound(sessionId: string) {
  const event = getRoundStateEvent(sessionId);
  if (event) publish(sessionId, event);
  else {
    publish(sessionId, {
      type: "round.reset",
      at: new Date().toISOString(),
      roundId: null,
    });
    publish(sessionId, {
      type: "highlight.updated",
      at: new Date().toISOString(),
      highlight: { teamId: null, event: null },
    });
  }
}

function failureFor(status: string) {
  if (status === "no_open_round") return errorResponse("no_open_round", "Tidak ada soal aktif.", 409);
  if (status === "team_not_buzzed") return errorResponse("team_not_buzzed", "Regu tersebut belum menekan tombol buzz.", 409);
  if (status === "already_answered") return errorResponse("already_answered", "Regu tersebut sudah mendapat giliran pada soal ini.", 409);
  if (status === "answer_in_progress") return errorResponse("answer_in_progress", "Waktu regu yang sedang menjawab belum habis.", 409);
  if (status === "not_waiting") return errorResponse("not_waiting", "Tidak sedang menunggu regu berikutnya.", 409);
  if (status === "no_candidate") return errorResponse("no_candidate", "Tidak ada regu buzz lain yang belum mendapat giliran.", 409);
  if (status === "no_answering_team") return errorResponse("no_answering_team", "Pilih regu yang sedang mendapat giliran menjawab.", 409);
  if (status === "invalid_penalty") return errorResponse("invalid_penalty", "Pengurangan poin harus 50, 75, atau 100.", 400);
  if (status === "unknown_team") return errorResponse("unknown_team", "Regu tidak ditemukan.", 404);
  return errorResponse("invalid_action", "Aksi ronde tidak valid.", 400);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;
  const gate = await requireModerator(sessionId);
  if (!gate.ok) return errorResponse(gate.error, gate.message, gate.status);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_json", "Body permintaan harus JSON.", 400);
  }
  if (typeof body !== "object" || body === null) {
    return errorResponse("invalid_body", "Body permintaan tidak valid.", 400);
  }

  const input = body as {
    action?: unknown;
    teamId?: unknown;
    penalty?: unknown;
  };
  const action = input.action as Action;

  if (action === "select") {
    if (typeof input.teamId !== "string" || !input.teamId.trim()) {
      return errorResponse("invalid_team", "Pilih regu yang sudah menekan tombol buzz.", 400);
    }
    const result = selectAnsweringTeam(sessionId, input.teamId);
    if (result.status !== "selected") return failureFor(result.status);
    publishCurrentRound(sessionId);
    return NextResponse.json({ ok: true, round: toRoundDto(result.round) });
  }

  if (action === "next") {
    const result = advanceToNextTeam(sessionId);
    if (result.status !== "advanced") return failureFor(result.status);
    publishCurrentRound(sessionId);
    return NextResponse.json({ ok: true, round: toRoundDto(result.round) });
  }

  if (action === "correct" || action === "wrong") {
    if (
      action === "wrong" &&
      (typeof input.penalty !== "number" ||
        ![50, 75, 100].includes(input.penalty))
    ) {
      return errorResponse("invalid_penalty", "Pilih pengurangan 50, 75, atau 100 poin.", 400);
    }
    const result = recordAnswerResult(
      sessionId,
      action,
      action === "wrong" ? input.penalty as number : undefined,
    );
    if (result.status !== "recorded") return failureFor(result.status);

    const team = toTeamDto(result.team);
    publish(sessionId, {
      type: "score.updated",
      at: new Date().toISOString(),
      team,
      delta: result.delta,
    });
    publishCurrentRound(sessionId);
    return NextResponse.json({
      ok: true,
      round: toRoundDto(result.round),
      team,
      delta: result.delta,
    });
  }

  return failureFor("invalid_action");
}

import { NextResponse } from "next/server";
import { memberByReg, MEMBERS } from "@/lib/members";
import { createAdminClient } from "@/lib/supabase/admin";

// A 40 s round tops out at 12 points a pickup; anything past this is a
// hand-crafted request, not a flight.
const MAX_SCORE = 600;
const TOP_N = 10;

/** Monday of the current week in IST (the team's clock, whatever the
 *  server's timezone), as YYYY-MM-DD. */
function weekKeyIST(): string {
  const d = new Date(Date.now() + 5.5 * 3600_000);
  const day = d.getUTCDay(); // 0 Sun .. 6 Sat
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

/** "ARSHPREET SUKHDEEP SINGH DHILLON" -> "Arshpreet Dhillon" */
function shortName(regNo: string): string {
  const full = MEMBERS.find((m) => m.regNo === regNo)?.name ?? regNo;
  const words = full.split(/\s+/).filter(Boolean);
  const pick = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return pick
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

async function board(me: string | null) {
  const db = createAdminClient();
  const week = weekKeyIST();

  const [{ data: rows, error }, { data: best }] = await Promise.all([
    db
      .from("game_scores")
      .select("reg_no, score, updated_at")
      .eq("week", week)
      .order("score", { ascending: false })
      .order("updated_at", { ascending: true }),
    db
      .from("game_scores")
      .select("reg_no, score")
      .order("score", { ascending: false })
      .order("updated_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  if (error) throw new Error(error.message);

  const all = rows ?? [];
  const idx = me ? all.findIndex((r) => r.reg_no === me) : -1;
  return {
    week,
    top: all.slice(0, TOP_N).map((r, i) => ({
      rank: i + 1,
      name: shortName(r.reg_no),
      score: r.score,
      me: r.reg_no === me,
    })),
    mine: idx < 0 ? null : { rank: idx + 1, score: all[idx].score },
    record: best ? { name: shortName(best.reg_no), score: best.score } : null,
  };
}

/** This week's top 10, the all-time record, and (with ?me=REG) your rank. */
export async function GET(request: Request) {
  const me = memberByReg(new URL(request.url).searchParams.get("me") ?? "");
  try {
    return NextResponse.json(await board(me?.regNo ?? null));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** Post a finished round. Only a member's best of the week is kept. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const member = memberByReg(String(body.regNo ?? ""));
  if (!member) {
    return NextResponse.json(
      { error: "That registration number isn't on the team roster." },
      { status: 404 },
    );
  }
  const score = Number(body.score);
  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    return NextResponse.json({ error: "Invalid score." }, { status: 400 });
  }

  const db = createAdminClient();
  const week = weekKeyIST();
  const { data: prev } = await db
    .from("game_scores")
    .select("score")
    .eq("reg_no", member.regNo)
    .eq("week", week)
    .maybeSingle();

  if (!prev || score > prev.score) {
    const { error } = await db.from("game_scores").upsert({
      reg_no: member.regNo,
      week,
      score,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  try {
    return NextResponse.json({
      ...(await board(member.regNo)),
      pilot: shortName(member.regNo),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

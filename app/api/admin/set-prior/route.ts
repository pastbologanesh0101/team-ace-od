import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { memberByReg } from "@/lib/members";
import { createAdminClient } from "@/lib/supabase/admin";
import { setPriorHours } from "@/lib/od-cycle";
import { parseDur } from "@/lib/od-budget";

const MAX_HOURS = 60 * 24; // sanity ceiling: 60 days

/**
 * Admin sets a member's carried-over OD — the time they'd already
 * used before this app. Accepts `hours` (number) or `value` (a
 * duration string like "2d 6h" / "30:00").
 */
export async function POST(request: Request) {
  const session = await currentSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const member = memberByReg(String(body.regNo ?? ""));
  if (!member) {
    return NextResponse.json({ error: "Unknown member." }, { status: 400 });
  }

  const hours =
    typeof body.hours === "number"
      ? body.hours
      : parseDur(String(body.value ?? ""));

  if (hours === null || !Number.isFinite(hours) || hours < 0) {
    return NextResponse.json(
      { error: "Couldn't read that duration. Try e.g. “2d 6h” or “30:00”." },
      { status: 400 },
    );
  }
  if (hours > MAX_HOURS) {
    return NextResponse.json(
      { error: "That's more than 60 days — check the value." },
      { status: 400 },
    );
  }

  const db = createAdminClient();
  const { error } = await setPriorHours(db, member.regNo, hours);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, hours });
}

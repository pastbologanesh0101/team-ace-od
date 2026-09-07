import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { memberByReg } from "@/lib/members";
import { createAdminClient } from "@/lib/supabase/admin";
import { resetCycle } from "@/lib/od-cycle";

/**
 * Admin starts a member on a fresh 14-day OD cycle. Past entries are
 * kept for the record but stop counting; the login block lifts.
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

  const db = createAdminClient();
  const { error } = await resetCycle(db, member.regNo);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

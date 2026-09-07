import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { memberByReg } from "@/lib/members";
import { createAdminClient } from "@/lib/supabase/admin";
import { setUnlimited } from "@/lib/od-cycle";

/** Admin exempts a member from the 14-day OD cap (or re-caps them). */
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
  const unlimited = Boolean(body.unlimited);

  const db = createAdminClient();
  const { error } = await setUnlimited(db, member.regNo, unlimited);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, unlimited });
}

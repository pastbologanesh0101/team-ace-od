import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { memberByReg } from "@/lib/members";
import { createAdminClient } from "@/lib/supabase/admin";

/** Admin clears a member's PIN — they set a new one on next login. */
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
  const { error } = await db
    .from("member_pins")
    .delete()
    .eq("reg_no", member.regNo);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

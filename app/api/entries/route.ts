import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The signed-in member's own entries. */
export async function GET() {
  const session = await currentSession();
  if (session?.role !== "member") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("od_entries")
    .select("id,name,reg_no,od_date,from_time,to_time,reason,status,created_at")
    .eq("reg_no", session.regNo)
    .order("od_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ entries: data ?? [] });
}

/** Create an OD entry for the signed-in member. */
export async function POST(request: Request) {
  const session = await currentSession();
  if (session?.role !== "member") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const od_date = String(body.od_date ?? "").trim();
  const from_time = String(body.from_time ?? "").trim();
  const to_time = String(body.to_time ?? "").trim();
  const reason = String(body.reason ?? "").trim();

  if (!reason) {
    return NextResponse.json({ error: "Reason is required." }, { status: 400 });
  }
  if (!DATE_RE.test(od_date)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }
  if (!TIME_RE.test(from_time) || !TIME_RE.test(to_time)) {
    return NextResponse.json({ error: "Invalid time." }, { status: 400 });
  }
  if (to_time <= from_time) {
    return NextResponse.json(
      { error: "“To time” must be after “From time”." },
      { status: 400 },
    );
  }
  if (reason.length > 500) {
    return NextResponse.json({ error: "Reason is too long." }, { status: 400 });
  }

  const db = createAdminClient();
  const { error } = await db.from("od_entries").insert({
    reg_no: session.regNo,
    name: session.name,
    od_date,
    from_time,
    to_time,
    reason,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

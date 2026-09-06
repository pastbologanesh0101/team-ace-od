import { NextResponse } from "next/server";
import { currentRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A member's own submissions from this device. */
export async function GET(request: Request) {
  const role = await currentRole();
  if (!role) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const device = new URL(request.url).searchParams.get("device") ?? "";
  if (!device) return NextResponse.json({ entries: [] });

  const db = createAdminClient();
  const { data, error } = await db
    .from("od_entries")
    .select("id,name,reg_no,od_date,from_time,to_time,reason,status,created_at")
    .eq("device_id", device)
    .order("od_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ entries: data ?? [] });
}

/** Create a new OD entry. */
export async function POST(request: Request) {
  const role = await currentRole();
  if (!role) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const device_id = String(body.device_id ?? "").slice(0, 64) || null;
  const name = String(body.name ?? "").trim();
  const reg_no = String(body.reg_no ?? "").trim().toUpperCase();
  const od_date = String(body.od_date ?? "").trim();
  const from_time = String(body.from_time ?? "").trim();
  const to_time = String(body.to_time ?? "").trim();
  const reason = String(body.reason ?? "").trim();

  if (!name || !reg_no || !reason) {
    return NextResponse.json(
      { error: "Name, registration number and reason are required." },
      { status: 400 },
    );
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
  if (name.length > 120 || reg_no.length > 30 || reason.length > 500) {
    return NextResponse.json(
      { error: "One of the fields is too long." },
      { status: 400 },
    );
  }

  const db = createAdminClient();
  const { error } = await db.from("od_entries").insert({
    device_id,
    name,
    reg_no,
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

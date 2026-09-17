import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_IDS = 500;

/** Admin clears (or restores) one or more OD entries from the working list. */
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

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  const archived = Boolean(body.archived);

  if (ids.length === 0 || ids.length > MAX_IDS) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const db = createAdminClient();
  const { error } = await db
    .from("od_entries")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

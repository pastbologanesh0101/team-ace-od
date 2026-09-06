import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  adminCookieValue,
  adminPasscode,
  COOKIE_OPTS,
  memberCookieValue,
  SESSION_COOKIE,
} from "@/lib/auth";
import { memberByReg } from "@/lib/members";
import { hashPin, isValidPin, verifyPin } from "@/lib/pin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const kind = String(body.kind ?? "");
  const jar = await cookies();

  // ---------- admin ----------
  if (kind === "admin") {
    const passcode = String(body.passcode ?? "").trim();
    if (!adminPasscode() || passcode !== adminPasscode()) {
      return NextResponse.json({ error: "Wrong admin passcode." }, { status: 401 });
    }
    jar.set(SESSION_COOKIE, adminCookieValue(), COOKIE_OPTS);
    return NextResponse.json({ role: "admin" });
  }

  // ---------- member ----------
  if (kind === "member") {
    const member = memberByReg(String(body.regNo ?? ""));
    if (!member) {
      return NextResponse.json(
        { error: "That registration number isn't on the team roster." },
        { status: 401 },
      );
    }
    const pin = String(body.pin ?? "");
    if (!isValidPin(pin)) {
      return NextResponse.json(
        { error: "PIN must be 4 to 8 digits." },
        { status: 400 },
      );
    }

    const db = createAdminClient();
    const { data: row } = await db
      .from("member_pins")
      .select("pin_hash")
      .eq("reg_no", member.regNo)
      .maybeSingle();

    if (row) {
      // existing PIN — verify
      if (!verifyPin(pin, row.pin_hash)) {
        return NextResponse.json({ error: "Wrong PIN." }, { status: 401 });
      }
    } else {
      // first login — this sets the PIN
      const { error } = await db
        .from("member_pins")
        .insert({ reg_no: member.regNo, pin_hash: hashPin(pin) });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    jar.set(SESSION_COOKIE, memberCookieValue(member.regNo), COOKIE_OPTS);
    return NextResponse.json({ role: "member", newPin: !row });
  }

  return NextResponse.json({ error: "Bad request." }, { status: 400 });
}

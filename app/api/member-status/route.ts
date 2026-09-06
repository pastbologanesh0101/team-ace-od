import { NextResponse } from "next/server";
import { memberByReg } from "@/lib/members";
import { createAdminClient } from "@/lib/supabase/admin";

/** Given a reg number: is it on the roster, and does it have a PIN yet? */
export async function GET(request: Request) {
  const regNo = new URL(request.url).searchParams.get("regNo") ?? "";
  const member = memberByReg(regNo);
  if (!member) {
    return NextResponse.json(
      { ok: false, error: "That registration number isn't on the team roster." },
      { status: 404 },
    );
  }

  const db = createAdminClient();
  const { data } = await db
    .from("member_pins")
    .select("reg_no")
    .eq("reg_no", member.regNo)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    name: member.name,
    regNo: member.regNo,
    hasPin: Boolean(data),
  });
}

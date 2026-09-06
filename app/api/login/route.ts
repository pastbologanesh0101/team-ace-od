import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { roleForPasscode, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const passcode = String(body.passcode ?? "");
  const role = roleForPasscode(passcode);

  if (!role) {
    return NextResponse.json({ error: "Wrong passcode." }, { status: 401 });
  }

  (await cookies()).set(SESSION_COOKIE, passcode.trim(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180, // 180 days
  });

  return NextResponse.json({ role });
}

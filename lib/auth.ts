import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { memberByReg } from "@/lib/members";

export const SESSION_COOKIE = "ace_session";

export type Session =
  | { role: "admin" }
  | { role: "member"; regNo: string; name: string };

function secret(): string {
  return process.env.SESSION_SECRET ?? "";
}
export function adminPasscode(): string {
  return (process.env.ADMIN_PASSCODE ?? "").trim();
}

function sign(payload: string): string {
  const mac = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${mac}`;
}

function unsign(value: string): string | null {
  const i = value.lastIndexOf(".");
  if (i < 0) return null;
  const payload = value.slice(0, i);
  const mac = value.slice(i + 1);
  const expected = createHmac("sha256", secret())
    .update(payload)
    .digest("hex");
  const a = Buffer.from(mac, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return payload;
}

/** Cookie value for an authenticated admin / member. */
export function adminCookieValue(): string {
  return sign("admin");
}
export function memberCookieValue(regNo: string): string {
  return sign(`m:${regNo}`);
}

export const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 180, // 180 days
};

/** The verified session for the current request, or null. */
export async function currentSession(): Promise<Session | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const payload = unsign(raw);
  if (!payload) return null;

  if (payload === "admin") return { role: "admin" };

  if (payload.startsWith("m:")) {
    const regNo = payload.slice(2);
    const member = memberByReg(regNo);
    if (!member) return null; // removed from the roster since
    return { role: "member", regNo: member.regNo, name: member.name };
  }
  return null;
}

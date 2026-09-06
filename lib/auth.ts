import { cookies } from "next/headers";

export const SESSION_COOKIE = "ace_session";
export type Role = "admin" | "member";

export function teamPasscode(): string {
  return (process.env.TEAM_PASSCODE ?? "").trim();
}
export function adminPasscode(): string {
  return (process.env.ADMIN_PASSCODE ?? "").trim();
}

/** Map a submitted passcode to a role, or null if it matches neither. */
export function roleForPasscode(input: string): Role | null {
  const p = input.trim();
  if (!p) return null;
  if (adminPasscode() && p === adminPasscode()) return "admin";
  if (teamPasscode() && p === teamPasscode()) return "member";
  return null;
}

/** The role of the current request, from its session cookie. */
export async function currentRole(): Promise<Role | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return value ? roleForPasscode(value) : null;
}

import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses Row-Level Security — use ONLY in
 * server code, after checking the caller is an admin. The key never
 * ships to the browser (no NEXT_PUBLIC_ prefix).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

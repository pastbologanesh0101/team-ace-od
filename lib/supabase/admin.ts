import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the SECRET key. Bypasses RLS, so
 * it must never be imported into client code. Every route that uses it
 * checks the session cookie first.
 */
export function createAdminClient() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

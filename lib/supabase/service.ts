import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. This is the ONLY thing that writes
// authoritative game state. Never import this into client code.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

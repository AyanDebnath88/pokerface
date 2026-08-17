"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser client — uses the anon key. All reads are constrained by RLS, so the
// client can only ever see public state plus its own hole cards.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

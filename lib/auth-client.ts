"use client";

import { createClient } from "@/lib/supabase/client";

// Ensure the visitor has a Supabase session. Guests get an anonymous session
// (a real auth.uid()), which is what makes RLS card-secrecy work for them and
// lets them later upgrade to a full account keeping the same id.
export async function ensureSession(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) return data.session.user.id;

  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error || !anon.user) {
    throw new Error(error?.message ?? "Could not start a session");
  }
  return anon.user.id;
}

export function getSupabase() {
  return createClient();
}

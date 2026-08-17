import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server client bound to the request's auth cookies. Used in Server Components
// and Server Actions to read as the current (possibly anonymous) user.
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component render — safe to ignore; the
            // middleware/route handler refreshes the session cookie instead.
          }
        },
      },
    },
  );
}

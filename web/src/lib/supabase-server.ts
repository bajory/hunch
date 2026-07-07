import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
          ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Cookie-backed Supabase client for Server Components / Server Actions — carries the signed-in admin's session. */
export async function createServerSupabase() {
  if (!url || !anon) return null;
  const cookieStore = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // called from a Server Component — session refresh is handled by proxy.ts instead
        }
      },
    },
  });
}

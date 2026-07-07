"use server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function signInWithPassword(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured for this environment." };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

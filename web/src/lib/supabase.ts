import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase >= 2.x uses PUBLISHABLE_KEY; fall back to legacy ANON_KEY
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
          ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && anon
  ? createClient(url, anon)
  : null;

export const isConfigured = !!supabase;

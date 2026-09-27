import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function readEnv(name: string): string {
  const vite = import.meta.env as Record<string, string | undefined>;
  const fromVite = vite[name];
  if (fromVite && fromVite.trim()) return fromVite.trim();
  if (typeof process !== "undefined" && process.env?.[name]?.trim()) return process.env[name].trim();
  return "";
}

const url = readEnv("VITE_SUPABASE_URL") || readEnv("NEXT_PUBLIC_SUPABASE_URL") || readEnv("SUPABASE_URL");
const anon = readEnv("VITE_SUPABASE_ANON_KEY") || readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") || readEnv("SUPABASE_ANON_KEY");

export const supabaseConfigured = Boolean(url && anon);

let client: SupabaseClient | null = null;

/** Browser/server singleton. Null when the public keys are not set, so Neon stays the source of truth. */
export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  if (!client) client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
